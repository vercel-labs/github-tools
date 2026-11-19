import type { Entity } from '@emulators/core'
import type { GitHubComment, GitHubPullRequest, GitHubRepo } from '@emulators/github'
import { ApiError } from '../../emulators.js'
import { requireActor, requireRead, ROLE_RANK, roleRank, type Ctx, type Role } from '../access.js'
import { callAsCaller, type SupplementContext } from './context.js'
import { categoryId, DISCUSSION_CATEGORIES, discussionId, discussionStore, type Discussion } from './discussions.js'

interface ResolvedThread extends Entity {
  root_comment_id: number
  resolved_by_id: number
}

/** The variables of the documents the SDK sends. */
interface Variables {
  owner?: string
  name?: string
  number?: number
  first?: number
  after?: string | null
  categoryId?: string | null
  expression?: string
  path?: string
  threadId?: string
  pullRequestId?: string
  mergeMethod?: string
  commitHeadline?: string
  commitBody?: string
  discussionId?: string
  body?: string
  input?: {
    branch: { repositoryNameWithOwner: string, branchName: string }
    expectedHeadOid: string
    message: { headline: string, body?: string }
    fileChanges?: { additions?: Array<{ path: string, contents: string }>, deletions?: Array<{ path: string }> }
  }
}

/** An entry of a GraphQL response's `errors`, with the `data` GitHub sends beside it. */
class GraphqlError extends Error {
  constructor(readonly type: string, message: string, readonly data: unknown = null) {
    super(message)
  }
}

const THREAD_PREFIX = 'PRRT_'
const CLOSING_REFERENCE = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?):?\s+(?:([\w.-]+\/[\w.-]+))?#(\d+)/giu
const UNSUPPORTED = 'EMULATOR_UNSUPPORTED'

/**
 * Names a document by its root field, and for `repository` by the fields under it. Nine of the
 * SDK's documents have no operation name, and several share a first line.
 */
export function documentKey(query: string): string | undefined {
  const root = /^\s*(\w+)/u.exec(query.slice(query.indexOf('{') + 1))?.[1]
  if (root !== 'repository') return root
  const field = /\brepository\s*\([^)]*\)\s*\{\s*(\w+)/u.exec(query)?.[1]
  if (field !== 'pullRequest') return `repository.${field}`
  return `repository.pullRequest.${/\bpullRequest\s*\([^)]*\)\s*\{\s*(\w+)/u.exec(query)?.[1]}`
}

// The longest common subsequence of two files' lines: for each line of `next`, its index in `previous`, or -1 for a new line.
function carriedLines(previous: string[], next: string[]): number[] {
  const lengths = Array.from({ length: previous.length + 1 }, () => new Uint32Array(next.length + 1))
  for (let i = previous.length - 1; i >= 0; i--) {
    for (let j = next.length - 1; j >= 0; j--) {
      lengths[i]![j] = previous[i] === next[j] ? lengths[i + 1]![j + 1]! + 1 : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!)
    }
  }
  const origin = new Array<number>(next.length).fill(-1)
  for (let i = 0, j = 0; i < previous.length && j < next.length;) {
    if (previous[i] === next[j]) origin[j++] = i++
    else if (lengths[i + 1]![j]! >= lengths[i]![j + 1]!) i++
    else j++
  }
  return origin
}

/**
 * `POST /graphql` for the documents `@github-tools/sdk` sends. It isn't a GraphQL engine: it
 * recognizes each document and answers from the store. Any other document gets an error, and
 * its text is added to `unknownDocuments`.
 */
export function registerGraphql({ app, store, gh, baseUrl }: SupplementContext, unknownDocuments: string[]) {
  const resolved = store.collection<ResolvedThread>('supplement.resolved_threads', ['root_comment_id'])
  const discussions = discussionStore(store)

  const lines = (text: string) => text.replace(/\n$/u, '').split('\n')
  const login = (userId: number) => gh.users.get(userId)?.login

  function repository(variables: Variables): GitHubRepo {
    const repo = gh.repos.findOneBy('full_name', `${variables.owner}/${variables.name}`)
    if (!repo) throw new GraphqlError('NOT_FOUND', `Could not resolve to a Repository with the name '${variables.owner}/${variables.name}'.`, { repository: null })
    return repo
  }

  function pullRequestNode(id: string | undefined): { pull: GitHubPullRequest, repo: GitHubRepo } {
    const pull = gh.pullRequests.all().find(candidate => candidate.node_id === id)
    const repo = pull && gh.repos.get(pull.repo_id)
    if (!pull || !repo) throw new GraphqlError('NOT_FOUND', `Could not resolve to a node with the global id of '${id}'`)
    return { pull, repo }
  }

  // The author of a pull request may resolve its threads and change its draft state without Write.
  function requireWriterOrAuthor(c: Ctx, repo: GitHubRepo, authorId: number) {
    const auth = c.get('authUser')
    const user = auth && !auth.installation ? gh.users.findOneBy('login', auth.login) : undefined
    const role: Role = user?.id === authorId && roleRank(gh, user, repo) >= ROLE_RANK.read ? 'read' : 'write'
    return requireActor(c, gh, repo, { permission: 'pull_requests', access: 'write', role })
  }

  function threadOf(id: unknown): { root: GitHubComment, repo: GitHubRepo } {
    const root = typeof id === 'string' && id.startsWith(THREAD_PREFIX) ? gh.comments.get(Number(id.slice(THREAD_PREFIX.length))) : undefined
    const repo = root && gh.repos.get(root.repo_id)
    if (!root || !repo || root.comment_type !== 'review' || root.in_reply_to_id !== null) throw new GraphqlError('NOT_FOUND', `Could not resolve to a node with the global id of '${id}'`)
    return { root, repo }
  }

  const discussionNode = (discussion: Discussion, repo: GitHubRepo) => ({
    id: discussionId(discussion),
    number: discussion.number,
    title: discussion.title,
    body: discussion.body,
    url: `${baseUrl}/${repo.full_name}/discussions/${discussion.number}`,
    createdAt: discussion.created_at,
    updatedAt: discussion.updated_at,
    isAnswered: discussion.answered,
    author: { login: login(discussion.user_id) },
    category: { name: discussion.category },
    comments: { totalCount: discussions.comments.findBy('discussion_id', discussion.id).length },
  })

  function discussion(c: Ctx, variables: Variables) {
    const repo = repository(variables)
    requireRead(c, gh, repo, 'discussions')
    const found = discussions.discussions.findBy('repo_id', repo.id).find(candidate => candidate.number === variables.number)
    if (!found) throw new GraphqlError('NOT_FOUND', `Could not resolve to a Discussion with the number of ${variables.number}.`, { repository: { discussion: null } })
    return { repository: { discussion: discussionNode(found, repo) } }
  }

  async function setDraft(c: Ctx, variables: Variables, draft: boolean) {
    const { pull, repo } = pullRequestNode(variables.pullRequestId)
    // emulate's own route changes the draft state, with the role guard in front of it.
    await callAsCaller(app, c, 'PATCH', `/repos/${repo.full_name}/pulls/${pull.number}`, { draft })
    return { pullRequest: { id: pull.node_id } }
  }

  function setAutoMerge(c: Ctx, variables: Variables, enable: boolean) {
    const { pull, repo } = pullRequestNode(variables.pullRequestId)
    const actor = requireActor(c, gh, repo, { permission: 'pull_requests', access: 'write', role: 'write' })
    if (enable && pull.state !== 'open') throw new GraphqlError('UNPROCESSABLE', 'Pull request is not open')
    const mergeMethod = String(variables.mergeMethod ?? 'MERGE')
    // emulate types `auto_merge` as always null and returns whatever the pull request holds. The request is recorded and never carried out.
    const autoMerge = enable
      ? { enabled_by: { login: actor.login, id: actor.id }, merge_method: mergeMethod.toLowerCase(), commit_title: variables.commitHeadline ?? null, commit_message: variables.commitBody ?? null }
      : null
    const updated = gh.pullRequests.update(pull.id, { auto_merge: autoMerge as null })!
    return {
      pullRequest: {
        number: pull.number,
        url: `${baseUrl}/${repo.full_name}/pull/${pull.number}`,
        autoMergeRequest: enable ? { enabledAt: updated.updated_at, mergeMethod } : null,
      },
    }
  }

  const documents: Record<string, (c: Ctx, variables: Variables) => unknown> = {
    'repository.pullRequest.reviewThreads'(c, variables) {
      const repo = repository(variables)
      requireRead(c, gh, repo, 'pull_requests')
      if (!gh.pullRequests.findBy('repo_id', repo.id).some(pull => pull.number === variables.number)) {
        throw new GraphqlError('NOT_FOUND', `Could not resolve to a PullRequest with the number of ${variables.number}.`, { repository: { pullRequest: null } })
      }
      const comments = gh.comments.findBy('repo_id', repo.id).filter(comment => comment.comment_type === 'review' && comment.pull_number === variables.number)
      const roots = comments.filter(comment => comment.in_reply_to_id === null)
      const start = variables.after ? Number(variables.after) : 0
      const page = roots.slice(start, start + (variables.first ?? roots.length))
      const end = start + page.length
      return {
        repository: {
          pullRequest: {
            reviewThreads: {
              totalCount: roots.length,
              pageInfo: { hasNextPage: end < roots.length, endCursor: page.length > 0 ? String(end) : null },
              nodes: page.map((root) => {
                const thread = [root, ...comments.filter(comment => comment.in_reply_to_id === root.id)]
                const resolution = resolved.findOneBy('root_comment_id', root.id)
                return {
                  id: `${THREAD_PREFIX}${root.id}`,
                  isResolved: Boolean(resolution),
                  isOutdated: false,
                  path: root.path,
                  line: root.line,
                  startLine: null,
                  resolvedBy: resolution ? { login: login(resolution.resolved_by_id) } : null,
                  comments: {
                    totalCount: thread.length,
                    nodes: thread.slice(0, 30).map(comment => ({ databaseId: comment.id, body: comment.body, createdAt: comment.created_at, author: { login: login(comment.user_id) } })),
                  },
                }
              }),
            },
          },
        },
      }
    },

    async 'repository.pullRequest.closingIssuesReferences'(c, variables) {
      const repo = repository(variables)
      const pull = await callAsCaller<{ body: string | null }>(app, c, 'GET', `/repos/${repo.full_name}/pulls/${variables.number}`)
      const nodes = [...(pull.body ?? '').matchAll(CLOSING_REFERENCE)].flatMap(([, fullName, number]) => {
        const target = fullName ? gh.repos.findOneBy('full_name', fullName) : repo
        const issue = target && gh.issues.findBy('repo_id', target.id).find(candidate => candidate.number === Number(number) && !candidate.is_pull_request)
        if (!target || !issue) return []
        return [{ number: issue.number, title: issue.title, state: issue.state.toUpperCase(), url: `${baseUrl}/${target.full_name}/issues/${issue.number}`, repository: { nameWithOwner: target.full_name } }]
      })
      return { repository: { pullRequest: { closingIssuesReferences: { nodes: nodes.slice(0, 10) } } } }
    },

    async 'repository.object'(c, variables) {
      const repo = repository(variables)
      const path = `/repos/${repo.full_name}`
      const { expression = repo.default_branch, path: file = '' } = variables
      // emulate resolves the expression and lists the commits that changed the file, newest first.
      const history = await callAsCaller<Array<{ sha: string, commit: { message: string, author: { name: string, email: string, date: string } }, author: { login: string } | null }>>(
        app, c, 'GET', `${path}/commits?sha=${encodeURIComponent(expression)}&path=${encodeURIComponent(file)}&per_page=100`,
      ).catch((error) => {
        if (error instanceof ApiError && error.status === 404) return undefined
        throw error
      })
      if (!history) return { repository: { object: null } }
      const head = await callAsCaller<{ sha: string }>(app, c, 'GET', `${path}/commits/${encodeURIComponent(expression)}`)
      const versions = await Promise.all(history.map(async (commit) => {
        const version = await callAsCaller<{ content: string }>(app, c, 'GET', `${path}/contents/${file}?ref=${commit.sha}`).catch((error) => {
          if (error instanceof ApiError && error.status === 404) return undefined
          throw error
        })
        return version ? lines(Buffer.from(version.content, 'base64').toString()) : []
      }))
      // Follows each line of the newest version back through the file's history, to the commit that introduced it.
      const blamed = new Array<number>(versions[0]?.length ?? 0).fill(history.length - 1)
      let positions = blamed.map((_, index) => index)
      for (let index = 0; index < history.length; index++) {
        const origin = carriedLines(versions[index + 1] ?? [], versions[index]!)
        positions = positions.map((position, line) => {
          if (position === -1) return -1
          if (origin[position] === -1) blamed[line] = index
          return origin[position]!
        })
      }
      const ranges: Array<{ startingLine: number, endingLine: number, commit: number }> = []
      blamed.forEach((commit, index) => {
        const last = ranges.at(-1)
        if (last?.commit === commit) last.endingLine = index + 1
        else ranges.push({ startingLine: index + 1, endingLine: index + 1, commit })
      })
      return {
        repository: {
          object: {
            oid: head.sha,
            blame: {
              ranges: ranges.map(({ commit, ...range }) => {
                const entry = history[commit]!
                return {
                  ...range,
                  age: 1,
                  commit: {
                    oid: entry.sha,
                    abbreviatedOid: entry.sha.slice(0, 7),
                    messageHeadline: entry.commit.message.split('\n')[0],
                    authoredDate: entry.commit.author.date,
                    url: `${baseUrl}/${repo.full_name}/commit/${entry.sha}`,
                    author: { name: entry.commit.author.name, email: entry.commit.author.email, user: entry.author ? { login: entry.author.login } : null },
                  },
                }
              }),
            },
          },
        },
      }
    },

    'repository.discussionCategories'(c, variables) {
      requireRead(c, gh, repository(variables), 'discussions')
      return { repository: { discussionCategories: { nodes: DISCUSSION_CATEGORIES.map(name => ({ id: categoryId(name), name })) } } }
    },

    'repository.discussions'(c, variables) {
      const repo = repository(variables)
      requireRead(c, gh, repo, 'discussions')
      const matching = discussions.discussions.findBy('repo_id', repo.id)
        .filter(candidate => !variables.categoryId || categoryId(candidate.category) === variables.categoryId)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.number - a.number)
      const start = variables.after ? Number(variables.after) : 0
      const page = matching.slice(start, start + (variables.first ?? matching.length))
      const end = start + page.length
      return {
        repository: {
          discussions: {
            pageInfo: { hasNextPage: end < matching.length, endCursor: page.length > 0 ? String(end) : null },
            nodes: page.map(candidate => discussionNode(candidate, repo)),
          },
        },
      }
    },

    'repository.discussion': discussion,

    node(c, variables) {
      const { repo } = threadOf(variables.threadId)
      requireRead(c, gh, repo, 'pull_requests')
      const [owner, name] = repo.full_name.split('/')
      return { node: { repository: { name, owner: { login: owner } } } }
    },

    resolveReviewThread(c, variables) {
      const { root, repo } = threadOf(variables.threadId)
      const pull = gh.pullRequests.findBy('repo_id', repo.id).find(candidate => candidate.number === root.pull_number)
      const actor = requireWriterOrAuthor(c, repo, pull?.user_id ?? -1)
      if (!resolved.findOneBy('root_comment_id', root.id)) resolved.insert({ root_comment_id: root.id, resolved_by_id: actor.id })
      return { resolveReviewThread: { thread: { id: variables.threadId, isResolved: true } } }
    },

    markPullRequestReadyForReview: async (c, variables) => ({ markPullRequestReadyForReview: await setDraft(c, variables, false) }),
    convertPullRequestToDraft: async (c, variables) => ({ convertPullRequestToDraft: await setDraft(c, variables, true) }),
    enablePullRequestAutoMerge: (c, variables) => ({ enablePullRequestAutoMerge: setAutoMerge(c, variables, true) }),
    disablePullRequestAutoMerge: (c, variables) => ({ disablePullRequestAutoMerge: setAutoMerge(c, variables, false) }),

    addDiscussionComment(c, variables) {
      const found = discussions.discussions.all().find(candidate => discussionId(candidate) === variables.discussionId)
      const repo = found && gh.repos.get(found.repo_id)
      if (!found || !repo) throw new GraphqlError('NOT_FOUND', `Could not resolve to a node with the global id of '${variables.discussionId}'`)
      const actor = requireActor(c, gh, repo, { permission: 'discussions', access: 'write', role: 'read' })
      const comment = discussions.comments.insert({ discussion_id: found.id, user_id: actor.id, body: variables.body ?? '' })
      discussions.discussions.update(found.id, {})
      return {
        addDiscussionComment: {
          comment: {
            id: `DC_${comment.id}`,
            url: `${baseUrl}/${repo.full_name}/discussions/${found.number}#discussioncomment-${comment.id}`,
            body: comment.body,
            createdAt: comment.created_at,
            author: { login: actor.login },
          },
        },
      }
    },

    // One commit from several file changes, built with emulate's Git database routes as the caller.
    async createCommitOnBranch(c, { input }) {
      if (!input) throw new GraphqlError('UNPROCESSABLE', 'createCommitOnBranch needs an input')
      const path = `/repos/${input.branch.repositoryNameWithOwner}`
      const ref = await callAsCaller<{ object: { sha: string } }>(app, c, 'GET', `${path}/git/ref/heads/${input.branch.branchName}`)
      if (ref.object.sha !== input.expectedHeadOid) {
        throw new GraphqlError('STALE_DATA', `Expected branch to point to "${input.expectedHeadOid}" but it did not. Pull and try again.`)
      }
      const head = await callAsCaller<{ tree: { sha: string } }>(app, c, 'GET', `${path}/git/commits/${ref.object.sha}`)
      const { additions = [], deletions = [] } = input.fileChanges ?? {}
      const blobs = await Promise.all(additions.map(addition => callAsCaller<{ sha: string }>(app, c, 'POST', `${path}/git/blobs`, { content: addition.contents, encoding: 'base64' })))
      const tree = await callAsCaller<{ sha: string }>(app, c, 'POST', `${path}/git/trees`, {
        base_tree: head.tree.sha,
        tree: [
          ...additions.map((addition, index) => ({ path: addition.path, mode: '100644', type: 'blob', sha: blobs[index]!.sha })),
          ...deletions.map(deletion => ({ path: deletion.path, mode: '100644', type: 'blob', sha: null })),
        ],
      })
      const message = input.message.body ? `${input.message.headline}\n\n${input.message.body}` : input.message.headline
      const commit = await callAsCaller<{ sha: string }>(app, c, 'POST', `${path}/git/commits`, { message, tree: tree.sha, parents: [ref.object.sha] })
      await callAsCaller(app, c, 'PATCH', `${path}/git/refs/heads/${input.branch.branchName}`, { sha: commit.sha })
      return { createCommitOnBranch: { commit: { oid: commit.sha, url: `${baseUrl}/${input.branch.repositoryNameWithOwner}/commit/${commit.sha}` } } }
    },
  }

  app.post('/graphql', async (c: Ctx) => {
    if (!c.get('authUser')) throw new ApiError(401, 'This endpoint requires you to be authenticated.')
    const { query, variables = {} } = await c.req.json<{ query: string, variables?: Variables }>()
    const key = documentKey(query)
    const answer = key === undefined ? undefined : documents[key]
    if (!answer) {
      unknownDocuments.push(query)
      return c.json({ errors: [{ type: UNSUPPORTED, message: `The GitHub emulator answers the GraphQL documents @github-tools/sdk sends, and this isn't one of them: ${query.replace(/\s+/gu, ' ').trim().slice(0, 200)}` }] })
    }
    try {
      return c.json({ data: await answer(c, variables) })
    } catch (error) {
      // GitHub answers a GraphQL request it refuses with 200 and the reason under `errors`.
      if (error instanceof GraphqlError) return c.json({ data: error.data, errors: [{ type: error.type, message: error.message }] })
      if (error instanceof ApiError && error.status === 403) return c.json({ data: null, errors: [{ type: 'FORBIDDEN', message: error.message }] })
      if (error instanceof ApiError && error.status === 404) return c.json({ data: null, errors: [{ type: 'NOT_FOUND', message: error.message }] })
      throw error
    }
  })

  return discussions
}
