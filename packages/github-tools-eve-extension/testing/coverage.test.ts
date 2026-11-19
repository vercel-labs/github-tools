import { executeGithubEveTool, listEveToolDescriptors, withGithubCallerAccess, type GithubToolName, type GithubWriteToolName } from '@github-tools/sdk/eve-runtime'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ROLE_REFUSAL } from './github/access'
import { startGithubEmulator, type GithubEmulator } from './github/emulator'

// The SDK's Octokit spaces writes a second apart, which the emulator doesn't need.
vi.mock('octokit', async (original) => {
  const module = await original<{ Octokit: { defaults(options: object): unknown } }>()
  return { ...module, Octokit: module.Octokit.defaults({ throttle: { enabled: false } }) }
})

// Every tool the SDK has, with its input schema, as the extension mounts them. Listing them makes
// no request, and the SDK still needs a token to build the list.
const TOOLS = listEveToolDescriptors({ token: 'unused' })

const REPO = 'acme/web'
const web = { owner: 'acme', repo: 'web' }

let github: GithubEmulator
let counter = 0
const unique = (prefix: string) => `${prefix}-${++counter}`
const call = <T = unknown>(login: string, method: string, path: string, body?: unknown) => github.request<T>(login, method, `/repos/${REPO}${path}`, body)
const mainSha = async () => (await call<{ object: { sha: string } }>('alice', 'GET', '/git/ref/heads/main')).object.sha

// Fixtures are alice's, who has Write, so neither the admin nor the reader acts on an item of their own.
async function issue() {
  return call<{ number: number, id: number }>('alice', 'POST', '/issues', { title: unique('Issue'), body: 'Something is broken.' })
}

async function issueComment() {
  const { number } = await issue()
  const comment = await call<{ id: number }>('alice', 'POST', `/issues/${number}/comments`, { body: 'A comment.' })
  return { number, commentId: comment.id }
}

async function branch() {
  const name = unique('branch')
  await call('alice', 'POST', '/git/refs', { ref: `refs/heads/${name}`, sha: await mainSha() })
  return name
}

async function pull(options: { draft?: boolean, body?: string } = {}) {
  const head = await branch()
  const path = `${head}.txt`
  const file = await call<{ commit: { sha: string } }>('alice', 'PUT', `/contents/${path}`, { message: `Add ${path}`, content: Buffer.from('one\ntwo\n').toString('base64'), branch: head })
  const created = await call<{ number: number, node_id: string }>('alice', 'POST', '/pulls', { title: unique('Pull request'), head, base: 'main', ...options })
  return { number: created.number, nodeId: created.node_id, head, path, sha: file.commit.sha }
}

async function reviewThread() {
  const created = await pull()
  const comment = await call<{ id: number }>('alice', 'POST', `/pulls/${created.number}/comments`, { body: 'Why two lines?', path: created.path, line: 1, side: 'RIGHT' })
  return { ...created, commentId: comment.id, threadId: `PRRT_${comment.id}` }
}

async function release() {
  const tag = unique('v1.0')
  const created = await call<{ id: number }>('alice', 'POST', '/releases', { tag_name: tag, name: tag, body: 'Notes.' })
  return { id: created.id, tag }
}

async function workflowRun(conclusion?: 'failure') {
  await call('alice', 'POST', '/actions/workflows/ci.yml/dispatches', { ref: 'main' })
  const { workflow_runs: runs } = await call<{ workflow_runs: Array<{ id: number, head_sha: string }> }>('alice', 'GET', '/actions/runs?per_page=100')
  const run = runs.reduce((latest, candidate) => candidate.id > latest.id ? candidate : latest)
  if (conclusion) github.finishWorkflowRun(run.id, conclusion)
  const { jobs } = await call<{ jobs: Array<{ id: number }> }>('alice', 'GET', `/actions/runs/${run.id}/jobs`)
  return { runId: run.id, jobId: jobs[0]!.id, sha: run.head_sha }
}

async function label() {
  const name = unique('label')
  await call('alice', 'POST', '/labels', { name, color: 'ededed' })
  return name
}

async function milestone() {
  return (await call<{ number: number }>('alice', 'POST', '/milestones', { title: unique('milestone') })).number
}

// What only a person with Triage can set on an issue.
async function triaged(number: unknown) {
  const found = await call<{ labels: Array<{ name: string }>, assignees: Array<{ login: string }>, milestone: { number: number } | null }>('alice', 'GET', `/issues/${number}`)
  return { labels: found.labels.map(entry => entry.name), assignees: found.assignees.map(user => user.login), milestone: found.milestone?.number ?? null }
}

const UNTRIAGED = { labels: [], assignees: [], milestone: null }

async function labeledIssue() {
  const [{ number }, name] = await Promise.all([issue(), label()])
  await call('alice', 'POST', `/issues/${number}/labels`, { labels: [name] })
  return { number, label: name }
}

async function gist(owner: string) {
  const created = await github.request<{ id: string }>(owner, 'POST', '/gists', { description: 'A note', public: true, files: { 'note.md': { content: 'A note.' } } })
  return created.id
}

// A mention is what gives a person a notification thread.
async function notification(login: string) {
  const { number } = await issue()
  await call('alice', 'POST', `/issues/${number}/comments`, { body: `@${login} can you look at this?` })
  const threads = await github.request<Array<{ id: string }>>(login, 'GET', '/notifications')
  return threads[0]!.id
}

const discussion = () => github.createDiscussion(REPO, 'alice', { title: unique('Discussion'), body: 'What do you think?', category: 'Ideas' }).number

type Sample = (login: string) => unknown

/**
 * An input for every tool, built on fresh fixtures. A tool with more than one code path returns
 * several, and the reader case runs the first. Adding a tool to the catalog without a sample here
 * is a type error, so a new tool lands with emulator support.
 */
const SAMPLES = {
  getRepository: () => web,
  listBranches: () => web,
  getFileContent: () => ({ ...web, path: 'README.md' }),
  getRepositoryTree: () => [web, { ...web, recursive: true }],
  createBranch: () => ({ ...web, branch: unique('created') }),
  deleteBranch: async () => ({ ...web, branch: await branch() }),
  forkRepository: () => web,
  createRepository: () => [{ name: unique('repository'), org: 'acme' }, { name: unique('repository'), autoInit: true }],
  createOrUpdateFile: async () => [
    { ...web, path: `${unique('file')}.md`, message: 'Add a file', content: 'Hello.' },
    { ...web, path: `${unique('file')}.md`, message: 'Add a file on a branch', content: 'Hello.', branch: await branch() },
  ],
  editFiles: () => ({
    ...web,
    branch: unique('edit'),
    message: 'Rewrite the README',
    edits: [{ path: 'README.md', find: '# web', replace: '# Web' }, { path: `${unique('notes')}.md`, content: 'Notes.' }],
    pullRequest: { title: 'Rewrite the README' },
  }),
  getBranchRules: () => ({ ...web, branch: 'main' }),
  getCollaboratorPermission: () => ({ ...web, username: 'alice' }),
  listPullRequests: async () => (await pull(), web),
  getPullRequest: async () => ({ ...web, pullNumber: (await pull()).number }),
  createPullRequest: async () => {
    const head = await branch()
    await call('alice', 'PUT', `/contents/${head}.txt`, { message: 'Add a file', content: Buffer.from('one\n').toString('base64'), branch: head })
    return { ...web, title: unique('Pull request'), head, base: 'main' }
  },
  mergePullRequest: async () => ({ ...web, pullNumber: (await pull()).number }),
  enablePullRequestAutoMerge: async () => ({ ...web, pullNumber: (await pull()).number, mergeMethod: 'squash' }),
  disablePullRequestAutoMerge: async () => ({ ...web, pullNumber: (await pull()).number }),
  updatePullRequest: async () => [
    { ...web, pullNumber: (await pull()).number, title: 'A better title' },
    { ...web, pullNumber: (await pull()).number, draft: true },
    { ...web, pullNumber: (await pull({ draft: true })).number, draft: false },
  ],
  updatePullRequestBranch: async () => {
    const created = await pull()
    await call('alice', 'PUT', `/contents/${unique('main')}.txt`, { message: 'Move main', content: Buffer.from('main\n').toString('base64') })
    return { ...web, pullNumber: created.number }
  },
  addPullRequestComment: async () => ({ ...web, pullNumber: (await pull()).number, body: 'Looks good.' }),
  updatePullRequestComment: async () => ({ ...web, commentId: (await issueComment()).commentId, body: 'Edited.' }),
  deletePullRequestComment: async () => ({ ...web, commentId: (await issueComment()).commentId }),
  listPullRequestFiles: async () => ({ ...web, pullNumber: (await pull()).number }),
  listPullRequestReviews: async () => ({ ...web, pullNumber: (await pull()).number }),
  createPullRequestReview: async () => {
    const created = await pull()
    return { ...web, pullNumber: created.number, event: 'COMMENT', body: 'One note.', comments: [{ path: created.path, line: 1, side: 'RIGHT', body: 'Why?' }] }
  },
  listPullRequestReviewThreads: async () => ({ ...web, pullNumber: (await reviewThread()).number, status: 'all' }),
  replyToReviewComment: async () => {
    const thread = await reviewThread()
    return { ...web, pullNumber: thread.number, commentId: thread.commentId, body: 'Because of the test.' }
  },
  resolveReviewThread: async () => ({ threadId: (await reviewThread()).threadId }),
  requestReviewers: async () => ({ ...web, pullNumber: (await pull()).number, reviewers: ['alice'] }),
  getPullRequestContext: async () => {
    const closes = await issue()
    const created = await pull({ body: `Fixes #${closes.number}` })
    return [{ ...web, pullNumber: created.number }, { ...web, pullNumber: created.number, includeChecks: true, includeLinkedIssues: true }]
  },
  getIssueContext: async () => ({ ...web, issueNumber: (await issueComment()).number }),
  listIssues: async () => (await issue(), web),
  getIssue: async () => ({ ...web, issueNumber: (await issue()).number }),
  listIssueComments: async () => ({ ...web, issueNumber: (await issueComment()).number }),
  createIssue: async () => ({ ...web, title: unique('Issue'), body: 'Something is broken.', labels: ['bug'], assignees: ['alice'], milestone: await milestone() }),
  addIssueComment: async () => ({ ...web, issueNumber: (await issue()).number, body: 'Thanks for the report.' }),
  updateIssueComment: async () => ({ ...web, commentId: (await issueComment()).commentId, body: 'Edited.' }),
  deleteIssueComment: async () => ({ ...web, commentId: (await issueComment()).commentId }),
  closeIssue: async () => ({ ...web, issueNumber: (await issue()).number }),
  updateIssue: async () => ({ ...web, issueNumber: (await issue()).number, title: 'A better title', labels: ['bug'] }),
  listLabels: () => web,
  addLabels: async () => ({ ...web, issueNumber: (await issue()).number, labels: ['bug'] }),
  removeLabel: async () => {
    const labeled = await labeledIssue()
    return { ...web, issueNumber: labeled.number, label: labeled.label }
  },
  createLabel: () => ({ ...web, name: unique('created-label'), color: 'ff0000' }),
  updateLabel: async () => ({ ...web, name: await label(), color: '00ff00' }),
  deleteLabel: async () => ({ ...web, name: await label() }),
  addAssignees: async () => ({ ...web, issueNumber: (await issue()).number, assignees: ['alice'] }),
  removeAssignees: async () => {
    const { number } = await issue()
    await call('alice', 'POST', `/issues/${number}/assignees`, { assignees: ['alice'] })
    return { ...web, issueNumber: number, assignees: ['alice'] }
  },
  listMilestones: () => web,
  listSubIssues: async () => {
    const [parent, child] = await Promise.all([issue(), issue()])
    await call('alice', 'POST', `/issues/${parent.number}/sub_issues`, { sub_issue_id: child.id })
    return { ...web, issueNumber: parent.number }
  },
  addSubIssue: async () => {
    const [parent, child] = await Promise.all([issue(), issue()])
    return { ...web, issueNumber: parent.number, subIssueNumber: child.number }
  },
  listIssueReactions: async () => {
    const { number } = await issue()
    await call('alice', 'POST', `/issues/${number}/reactions`, { content: 'eyes' })
    return { ...web, issueNumber: number }
  },
  addIssueReaction: async () => ({ ...web, issueNumber: (await issue()).number, content: 'rocket' }),
  listCommentReactions: async () => {
    const { commentId } = await issueComment()
    await call('alice', 'POST', `/issues/comments/${commentId}/reactions`, { content: 'heart' })
    return { ...web, commentId }
  },
  addCommentReaction: async () => ({ ...web, commentId: (await issueComment()).commentId, content: '+1' }),
  listDiscussions: () => (discussion(), [web, { ...web, category: 'Ideas' }]),
  getDiscussion: () => ({ ...web, discussionNumber: discussion() }),
  addDiscussionComment: () => ({ ...web, discussionNumber: discussion(), body: 'I agree.' }),
  listNotifications: async login => (await notification(login), [{}, { all: true }]),
  markNotificationRead: async login => ({ threadId: await notification(login) }),
  searchCode: () => ({ query: 'repo:acme/web web' }),
  searchRepositories: () => ({ query: 'web org:acme' }),
  searchIssues: async () => (await issue(), { query: 'repo:acme/web is:issue Issue' }),
  listCommits: () => [web, { ...web, path: 'README.md' }],
  getCommit: () => ({ ...web, ref: 'main' }),
  getBlame: () => [{ ...web, path: 'README.md' }, { ...web, path: 'README.md', ref: 'main', line: 1 }],
  compareCommits: async () => ({ ...web, base: 'main', head: (await pull()).head }),
  listGists: async login => (await gist(login), [{}, { username: 'alice' }]),
  getGist: async login => ({ gistId: await gist(login) }),
  listGistComments: async login => ({ gistId: await gist(login) }),
  createGist: () => ({ description: 'A note', files: { 'note.md': { content: 'A note.' } } }),
  updateGist: async login => ({ gistId: await gist(login), files: { 'more.md': { content: 'More.' } }, filesToDelete: ['note.md'] }),
  deleteGist: async login => ({ gistId: await gist(login) }),
  createGistComment: async login => ({ gistId: await gist(login), body: 'Useful.' }),
  listWorkflows: () => web,
  listWorkflowRuns: async () => (await workflowRun(), [web, { ...web, workflowId: 'ci.yml' }]),
  getWorkflowRun: async () => ({ ...web, runId: (await workflowRun()).runId }),
  listWorkflowJobs: async () => ({ ...web, runId: (await workflowRun()).runId }),
  getWorkflowJobLogs: async () => ({ ...web, jobId: (await workflowRun()).jobId }),
  triggerWorkflow: () => ({ ...web, workflowId: 'ci.yml', ref: 'main' }),
  cancelWorkflowRun: async () => ({ ...web, runId: (await workflowRun()).runId }),
  rerunWorkflowRun: async () => [
    { ...web, runId: (await workflowRun('failure')).runId },
    { ...web, runId: (await workflowRun('failure')).runId, onlyFailedJobs: true },
  ],
  listCheckRuns: () => ({ ...web, ref: 'main' }),
  getCombinedStatus: async () => {
    const sha = await mainSha()
    await call('alice', 'POST', `/statuses/${sha}`, { state: 'success', context: 'ci/build' })
    return [{ ...web, ref: 'main' }, { ...web, ref: sha }]
  },
  createCommitStatus: async () => ({ ...web, sha: await mainSha(), state: 'pending', context: 'bot/review' }),
  getCiFailureContext: async () => {
    const failed = await workflowRun('failure')
    return [{ ...web, runId: failed.runId }, { ...web, ref: 'main' }]
  },
  listReleases: async () => (await release(), web),
  getLatestRelease: async () => (await release(), web),
  getRelease: async () => {
    const created = await release()
    return [{ ...web, releaseId: created.id }, { ...web, tag: created.tag }]
  },
  getReleaseContext: async () => {
    await release()
    return [web, { ...web, tag: (await release()).tag }]
  },
  createRelease: () => ({ ...web, tagName: unique('v2.0'), name: 'Two', body: 'Notes.' }),
  updateRelease: async () => ({ ...web, releaseId: (await release()).id, name: 'Renamed' }),
  deleteRelease: async () => ({ ...web, releaseId: (await release()).id }),
  listCodeScanningAlerts: () => [web, { ...web, severity: 'high' }],
  listDependabotAlerts: () => [web, { ...web, perPage: 1 }],
  listSecretScanningAlerts: () => web,
} satisfies Record<GithubToolName, Sample>

interface ReaderCase {
  /** Why GitHub answers a person with Read with success. */
  why: string
  /** What the emulator has to hold afterward, where GitHub accepts the call and ignores part of it. */
  holds?: (input: Record<string, unknown>, result: unknown) => Promise<void>
}

/**
 * The writes GitHub accepts from a person with Read, each with the reason. Every other write tool
 * has to be refused for a reader: without that, a route missing from the role guard would go
 * unnoticed. Where GitHub accepts a call and ignores what the person may not set, the status isn't
 * enough, so `holds` reads the issue back.
 */
const READER_MAY: Partial<Record<GithubWriteToolName, ReaderCase>> = {
  createIssue: {
    why: 'anyone who can read a repository can open an issue, and GitHub drops the labels, assignees, and milestone they send',
    holds: async (_input, result) => expect(await triaged((result as { number: number }).number)).toEqual(UNTRIAGED),
  },
  addAssignees: {
    why: 'GitHub ignores the assignees a person without Triage adds, and answers with success',
    holds: async input => expect((await triaged(input.issueNumber)).assignees).toEqual([]),
  },
  removeAssignees: {
    why: 'GitHub ignores the assignees a person without Triage removes, and answers with success',
    holds: async input => expect((await triaged(input.issueNumber)).assignees).toEqual(['alice']),
  },
  addIssueComment: { why: 'anyone who can read a repository can comment' },
  addPullRequestComment: { why: 'anyone who can read a repository can comment' },
  createPullRequest: { why: 'anyone who can read a repository can open a pull request between its branches' },
  createPullRequestReview: { why: 'anyone who can read a repository can leave a review comment' },
  replyToReviewComment: { why: 'anyone who can read a repository can reply in a review thread' },
  addIssueReaction: { why: 'anyone who can read a repository can react' },
  addCommentReaction: { why: 'anyone who can read a repository can react' },
  addDiscussionComment: { why: 'anyone who can read a repository can comment on a discussion' },
  forkRepository: { why: 'anyone who can read a repository can fork it' },
  createGist: { why: 'a gist belongs to its user' },
  updateGist: { why: 'a gist belongs to its user' },
  deleteGist: { why: 'a gist belongs to its user' },
  createGistComment: { why: 'anyone can comment on a gist' },
  markNotificationRead: { why: 'a notification thread belongs to its user' },
}

// Runs a tool the way the extension does. A failed call throws: a catalog error with its `{ code, status }` as the cause.
async function run(name: GithubToolName, login: string, input: unknown) {
  const { inputSchema } = TOOLS.find(tool => tool.name === name)!
  return executeGithubEveTool(name, inputSchema.parse(input) as Record<string, unknown>, { token: github.tokenFor(login) })
}

const inputs = async (name: GithubToolName, login: string) => [await SAMPLES[name](login)].flat()

// A REST refusal is a catalog error with status 403. A GraphQL one is Octokit's error, whose message quotes the guard's.
function isForbidden(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return (error.cause as { status?: number } | undefined)?.status === 403 || error.message.includes(ROLE_REFUSAL)
}

beforeAll(async () => {
  github = await startGithubEmulator({
    repositories: {
      [REPO]: {
        labels: ['bug'],
        workflows: ['ci.yml'],
        alerts: {
          codeScanning: [{ rule: 'js/sql-injection', severity: 'high', path: 'src/db.ts', line: 12 }],
          dependabot: [
            { package: 'lodash', ecosystem: 'npm', severity: 'high', summary: 'Prototype pollution', firstPatchedVersion: '4.17.21' },
            { package: 'minimist', ecosystem: 'npm', severity: 'medium', summary: 'Prototype pollution' },
          ],
          secretScanning: [{ secretType: 'github_personal_access_token' }],
        },
      },
    },
    people: { alice: { role: 'write' }, bob: { role: 'read' } },
  })
  Object.assign(process.env, { EVE_DEV: '1', GITHUB_TOOLS_EMULATE_GITHUB: github.url, GITHUB_TOOLS_EMULATE_CONNECT: 'http://127.0.0.1:9' })
  await import('./redirect')
})

afterAll(() => github.close())

describe('every tool against the GitHub emulator', () => {
  it.each(TOOLS.map(tool => tool.name))('%s is answered', async (name) => {
    for (const input of await inputs(name, github.admin)) {
      await expect(run(name, github.admin, input), `${name}(${JSON.stringify(input)})`).resolves.toBeDefined()
    }
  })

  // `createOrUpdateFile` and `editFiles` fall back to REST when their GraphQL call fails, so a missing handler would hide behind a success.
  it('was sent no GraphQL document it doesn\'t answer', () => {
    expect(github.unknownDocuments).toEqual([])
  })

  it.each(TOOLS.filter(tool => tool.writeTool).map(tool => tool.name))('%s as a reader', async (name) => {
    const [input] = await inputs(name, 'bob')
    const allowed = READER_MAY[name as GithubWriteToolName]
    if (allowed) {
      const result = await run(name, 'bob', input).catch((error: unknown) => {
        throw new Error(`${name} should succeed for a person with Read: ${allowed.why}`, { cause: error })
      })
      await allowed.holds?.(input as Record<string, unknown>, result)
      return
    }
    const outcome = await run(name, 'bob', input).then(result => ({ result, error: undefined }), (error: unknown) => ({ result: undefined, error }))
    expect(isForbidden(outcome.error), `${name} should be refused for a person with Read, and got ${JSON.stringify(outcome)}`).toBe(true)
  })

  // The reader cases above update alice's issue, which GitHub refuses. On their own issue, GitHub applies what an author may change.
  it('updateIssue as the author keeps their edit and drops the labels, assignees, and milestone', async () => {
    const own = await call<{ number: number }>('bob', 'POST', '/issues', { title: unique('Issue') })
    await run('updateIssue', 'bob', { ...web, issueNumber: own.number, title: 'A better title', labels: ['bug'], assignees: ['alice'], milestone: await milestone() })
    expect((await call<{ title: string }>('alice', 'GET', `/issues/${own.number}`)).title).toBe('A better title')
    expect(await triaged(own.number)).toEqual(UNTRIAGED)
  })

  it('answers the review thread lookup of the caller-access check', async () => {
    const { threadId } = await reviewThread()
    const installation = await github.mintInstallationToken()
    // A GitHub commenter is the caller, and the tool runs with the App's token once their role on the thread's repository allows it.
    const as = (login: string) => executeGithubEveTool('resolveReviewThread', { threadId }, { token: withGithubCallerAccess(installation.token, { login, repository: web }) })
    await expect(as('bob')).rejects.toMatchObject({ cause: { code: 'github_tools.CALLER_FORBIDDEN' } })
    await expect(as('alice')).resolves.toMatchObject({ threadId, isResolved: true })
    expect(github.unknownDocuments).toEqual([])
  })

  it('has no supplement route that emulate answers itself', async () => {
    const plain = await startGithubEmulator({ repositories: { [REPO]: {} }, supplement: false })
    // Param names differ between two definitions of one route, so they are compared without them.
    const shape = (route: { method: string, path: string }) => `${route.method} ${route.path.replace(/:\w+(?:\{[^}]*\})?/gu, ':param')}`
    const emulated = new Set(plain.app.routeTable.map(shape))
    await plain.close()
    expect(github.supplementRoutes.length).toBeGreaterThan(0)
    for (const route of github.supplementRoutes) {
      expect(emulated.has(shape(route)), `emulate now answers ${route.method} ${route.path}: delete this route from the supplement`).toBe(false)
    }
  })
})
