import { z } from 'zod'
import { withOctokit } from '../client'
import type { CommitIdentity } from '../types'
import { applyDetailBody, detailSchema, type DetailLevel } from './detail'
import { fetchAllPages, maxPagesSchema, pageSchema, pagedList } from './pagination'
import { composeCommitMessage } from './repository'

export const listPullRequestsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  state: z.enum(['open', 'closed', 'all']).optional().default('open').describe('Filter by state'),
  perPage: z.number().optional().default(30).describe('Number of results to return per page (max 100)'),
  page: pageSchema,
  maxPages: maxPagesSchema,
})

export const listPullRequestsDescription = 'List pull requests for a GitHub repository. When hasMore, pass nextPage or raise maxPages — do not repeat the same call.'

export async function listPullRequestsCore({ token, owner, repo, state, perPage, page = 1, maxPages }: { token: string, owner: string, repo: string, state: 'open' | 'closed' | 'all', perPage: number, page?: number, maxPages?: number }) {
  return withOctokit(token, async (octokit) => {
  const { items, hasMore } = await fetchAllPages(async currentPage => {
    const { data } = await octokit.rest.pulls.list({ owner, repo, state, per_page: perPage, page: currentPage })
    return data
  }, perPage, maxPages, page)
  return pagedList(items.map(pr => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    url: pr.html_url,
    author: pr.user?.login,
    branch: pr.head.ref,
    base: pr.base.ref,
    draft: pr.draft,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
  })), perPage, page, hasMore)
  })
}

export const getPullRequestInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
  detail: detailSchema,
})

export const getPullRequestDescription = 'Get detailed information about a specific pull request. Body is truncated by default (detail: summary) — set detail full for the complete description'

export async function getPullRequestCore({ token, owner, repo, pullNumber, detail = 'summary' }: { token: string, owner: string, repo: string, pullNumber: number, detail?: DetailLevel }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber })
  return {
    number: data.number,
    title: data.title,
    body: applyDetailBody(data.body, detail),
    state: data.state,
    url: data.html_url,
    author: data.user?.login,
    branch: data.head.ref,
    headSha: data.head.sha,
    base: data.base.ref,
    draft: data.draft,
    merged: data.merged,
    mergeable: data.mergeable,
    additions: data.additions,
    deletions: data.deletions,
    changedFiles: data.changed_files,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    mergedAt: data.merged_at,
  }
  })
}

export const createPullRequestInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  title: z.string().describe('Pull request title'),
  body: z.string().optional().describe('Pull request description (supports Markdown)'),
  head: z.string().describe('Branch containing the changes (format: branch or username:branch)'),
  base: z.string().describe('Branch to merge into'),
  draft: z.boolean().optional().default(false).describe('Create as draft pull request'),
})

export const createPullRequestDescription = 'Create a new pull request in a GitHub repository'

/** Not idempotent — each call creates a new pull request. */
export async function createPullRequestCore({ token, owner, repo, title, body, head, base, draft }: { token: string, owner: string, repo: string, title: string, body?: string, head: string, base: string, draft: boolean }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.pulls.create({ owner, repo, title, body, head, base, draft })
  return {
    number: data.number,
    title: data.title,
    url: data.html_url,
    state: data.state,
    draft: data.draft,
    branch: data.head.ref,
    base: data.base.ref,
  }
  })
}

const MARK_READY_FOR_REVIEW_MUTATION = `
  mutation($pullRequestId: ID!) {
    markPullRequestReadyForReview(input: { pullRequestId: $pullRequestId }) {
      pullRequest { id }
    }
  }
`

const CONVERT_TO_DRAFT_MUTATION = `
  mutation($pullRequestId: ID!) {
    convertPullRequestToDraft(input: { pullRequestId: $pullRequestId }) {
      pullRequest { id }
    }
  }
`

export const updatePullRequestInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
  title: z.string().optional().describe('New pull request title'),
  body: z.string().optional().describe('New pull request description (supports Markdown)'),
  state: z.enum(['open', 'closed']).optional().describe('Open or close the pull request'),
  base: z.string().optional().describe('Change the base branch to merge into'),
  draft: z.boolean().optional().describe('Convert to draft (true) or mark as ready for review (false)'),
})

export const updatePullRequestDescription = 'Update a pull request — title, body, state, base branch, or draft status. Draft toggling uses the GitHub GraphQL API since the REST update endpoint does not support it'

/** Not idempotent — each call applies a new revision. */
export async function updatePullRequestCore({ token, owner, repo, pullNumber, title, body, state, base, draft }: { token: string, owner: string, repo: string, pullNumber: number, title?: string, body?: string, state?: 'open' | 'closed', base?: string, draft?: boolean }) {
  return withOctokit(token, async (octokit) => {
  const hasRestUpdate = title !== undefined || body !== undefined || state !== undefined || base !== undefined
  const { data } = hasRestUpdate
    ? await octokit.rest.pulls.update({ owner, repo, pull_number: pullNumber, title, body, state, base })
    : await octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber })

  if (draft !== undefined && draft !== data.draft) {
    await octokit.graphql(draft ? CONVERT_TO_DRAFT_MUTATION : MARK_READY_FOR_REVIEW_MUTATION, { pullRequestId: data.node_id })
  }

  return {
    number: data.number,
    title: data.title,
    state: data.state,
    draft: draft ?? data.draft,
    url: data.html_url,
    base: data.base.ref,
    updatedAt: data.updated_at,
  }
  })
}

export const mergePullRequestInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
  commitTitle: z.string().optional().describe('Title for the automatic merge commit'),
  commitMessage: z.string().optional().describe('Extra detail to append to automatic commit message'),
  mergeMethod: z.enum(['merge', 'squash', 'rebase']).optional().default('merge').describe('Merge strategy'),
})

export const mergePullRequestDescription = 'Merge a pull request'

/** Not idempotent — merging an already-merged PR returns an error from GitHub. */
export async function mergePullRequestCore({
  token,
  owner,
  repo,
  pullNumber,
  commitTitle,
  commitMessage,
  mergeMethod,
  coAuthors,
}: {
  token: string
  owner: string
  repo: string
  pullNumber: number
  commitTitle?: string
  commitMessage?: string
  mergeMethod: 'merge' | 'squash' | 'rebase'
  coAuthors?: CommitIdentity[]
}) {
  return withOctokit(token, async (octokit) => {
  const finalMessage = composeCommitMessage(commitMessage ?? '', coAuthors) || undefined
  const { data } = await octokit.rest.pulls.merge({
    owner,
    repo,
    pull_number: pullNumber,
    commit_title: commitTitle,
    commit_message: finalMessage,
    merge_method: mergeMethod,
  })
  return {
    merged: data.merged,
    message: data.message,
    sha: data.sha,
  }
  })
}

export const addPullRequestCommentInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
  body: z.string().describe('Comment text (supports Markdown)'),
})

export const addPullRequestCommentDescription = 'Add a comment to a pull request'

/** Not idempotent — each call adds another comment. */
export async function addPullRequestCommentCore({ token, owner, repo, pullNumber, body }: { token: string, owner: string, repo: string, pullNumber: number, body: string }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.issues.createComment({ owner, repo, issue_number: pullNumber, body })
  return {
    id: data.id,
    url: data.html_url,
    body: data.body,
    author: data.user?.login,
    createdAt: data.created_at,
  }
  })
}

export const updatePullRequestCommentInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  commentId: z.number().describe('Comment ID (from the comment returned by addPullRequestComment)'),
  body: z.string().describe('New comment text (supports Markdown)'),
})

export const updatePullRequestCommentDescription = 'Update the body of a comment on a pull request'

/** Not idempotent — each call applies a new revision. */
export async function updatePullRequestCommentCore({ token, owner, repo, commentId, body }: { token: string, owner: string, repo: string, commentId: number, body: string }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.issues.updateComment({ owner, repo, comment_id: commentId, body })
  return {
    id: data.id,
    url: data.html_url,
    body: data.body,
    updatedAt: data.updated_at,
  }
  })
}

export const deletePullRequestCommentInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  commentId: z.number().describe('Comment ID to delete'),
})

export const deletePullRequestCommentDescription = 'Delete a comment from a pull request permanently'

/** Not idempotent — deleting an already-deleted comment returns 404 from GitHub. */
export async function deletePullRequestCommentCore({ token, owner, repo, commentId }: { token: string, owner: string, repo: string, commentId: number }) {
  return withOctokit(token, async (octokit) => {
  await octokit.rest.issues.deleteComment({ owner, repo, comment_id: commentId })
  return { deleted: true, commentId }
  })
}

export const listPullRequestFilesInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
  includePatch: z.boolean().optional().default(false).describe('Include diff patches (token-heavy). Prefer false for an overview, then set true with filenames to fetch specific diffs'),
  filenames: z.array(z.string()).optional().describe('If set, only return these file paths (useful with includePatch: true for targeted diffs)'),
  perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
  page: pageSchema,
})

export const listPullRequestFilesDescription = 'List files changed in a pull request with status and stats. Patches are omitted by default — set includePatch true (optionally with filenames) to fetch diffs. When hasMore, pass nextPage — do not repeat the same call.'

export async function listPullRequestFilesCore({ token, owner, repo, pullNumber, includePatch, filenames, perPage, page }: { token: string, owner: string, repo: string, pullNumber: number, includePatch: boolean, filenames?: string[], perPage: number, page: number }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.pulls.listFiles({ owner, repo, pull_number: pullNumber, per_page: perPage, page })
  const filenameSet = filenames?.length ? new Set(filenames) : null
  return pagedList(data
    .filter(file => !filenameSet || filenameSet.has(file.filename))
    .map(file => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      ...includePatch && file.patch != null ? { patch: file.patch } : {},
    })), perPage, page, data.length >= perPage)
  })
}

export const listPullRequestReviewsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
  perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
  page: pageSchema,
})

export const listPullRequestReviewsDescription = 'List reviews on a pull request (approvals, change requests, and comments). When hasMore, pass nextPage — do not repeat the same call.'

export async function listPullRequestReviewsCore({ token, owner, repo, pullNumber, perPage, page }: { token: string, owner: string, repo: string, pullNumber: number, perPage: number, page: number }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.pulls.listReviews({ owner, repo, pull_number: pullNumber, per_page: perPage, page })
  return pagedList(data.map(review => ({
    id: review.id,
    state: review.state,
    body: review.body,
    author: review.user?.login,
    url: review.html_url,
    submittedAt: review.submitted_at,
  })), perPage, page, data.length >= perPage)
  })
}

export const createPullRequestReviewInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
  body: z.string().optional().describe('Review body text (supports Markdown)'),
  event: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']).describe('Review action: approve, request changes, or comment'),
  comments: z.array(z.object({
    path: z.string().describe('File path relative to the repository root'),
    body: z.string().describe('Inline comment text'),
    line: z.number().optional().describe('Line number in the file to comment on'),
    side: z.enum(['LEFT', 'RIGHT']).optional().describe('Which side of the diff to comment on (LEFT = base, RIGHT = head)'),
  })).optional().describe('Inline review comments on specific files and lines'),
})

export const createPullRequestReviewDescription = 'Submit a pull request review — approve, request changes, or comment with optional inline comments on specific lines'

/** Not idempotent — each call submits a new review. */
export async function createPullRequestReviewCore({ token, owner, repo, pullNumber, body, event, comments }: { token: string, owner: string, repo: string, pullNumber: number, body?: string, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', comments?: Array<{ path: string, body: string, line?: number, side?: 'LEFT' | 'RIGHT' }> }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    body,
    event,
    comments,
  })
  return {
    id: data.id,
    state: data.state,
    body: data.body,
    url: data.html_url,
    author: data.user?.login,
    submittedAt: data.submitted_at,
  }
  })
}

export const listPullRequestReviewThreadsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
  status: z.enum(['unresolved', 'all']).optional().default('unresolved').describe('unresolved returns only threads awaiting action (default, saves tokens); all includes resolved threads'),
  detail: detailSchema,
  perPage: z.number().int().positive().max(50).optional().default(30).describe('Number of threads to fetch per call (max 50)'),
  after: z.string().optional().describe('Cursor from a previous call (endCursor) to fetch the next page of threads'),
})

export const listPullRequestReviewThreadsDescription = 'List review threads on a pull request with their comments, resolution state, and the IDs needed to reply (commentId) or resolve (threadId). Unresolved threads only by default (GitHub GraphQL API)'

const REVIEW_THREADS_QUERY = /* GraphQL */ `
  query ReviewThreads($owner: String!, $name: String!, $number: Int!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        reviewThreads(first: $first, after: $after) {
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            isResolved
            isOutdated
            path
            line
            startLine
            resolvedBy {
              login
            }
            comments(first: 30) {
              totalCount
              nodes {
                databaseId
                body
                createdAt
                author {
                  login
                }
              }
            }
          }
        }
      }
    }
  }
`

type ReviewThreadsQueryData = {
  repository: {
    pullRequest: {
      reviewThreads: {
        totalCount: number
        pageInfo: { hasNextPage: boolean, endCursor: string | null }
        nodes: Array<{
          id: string
          isResolved: boolean
          isOutdated: boolean
          path: string | null
          line: number | null
          startLine: number | null
          resolvedBy: { login: string } | null
          comments: {
            totalCount: number
            nodes: Array<{
              databaseId: number | null
              body: string
              createdAt: string
              author: { login: string } | null
            }>
          }
        }>
      } | null
    } | null
  } | null
}

export async function listPullRequestReviewThreadsCore({ token, owner, repo, pullNumber, status, detail, perPage, after }: { token: string, owner: string, repo: string, pullNumber: number, status: 'unresolved' | 'all', detail: DetailLevel, perPage: number, after?: string }) {
  return withOctokit(token, async (octokit) => {
  const data = (await octokit.graphql(REVIEW_THREADS_QUERY, {
    owner,
    name: repo,
    number: pullNumber,
    first: perPage,
    after,
  })) as ReviewThreadsQueryData

  if (!data.repository) {
    return { error: `Repository not found: ${owner}/${repo}` }
  }
  const reviewThreads = data.repository.pullRequest?.reviewThreads
  if (!reviewThreads) {
    return { error: `Pull request not found: ${owner}/${repo}#${pullNumber}` }
  }

  const threads = reviewThreads.nodes
    .filter(thread => status === 'all' || !thread.isResolved)
    .map(thread => ({
      threadId: thread.id,
      isResolved: thread.isResolved,
      isOutdated: thread.isOutdated,
      path: thread.path,
      line: thread.line,
      startLine: thread.startLine,
      resolvedBy: thread.resolvedBy?.login ?? null,
      commentCount: thread.comments.totalCount,
      comments: thread.comments.nodes.map(comment => ({
        commentId: comment.databaseId,
        author: comment.author?.login ?? null,
        body: applyDetailBody(comment.body, detail),
        createdAt: comment.createdAt,
      })),
    }))

  return {
    // Total across all threads on the PR, before the `status` filter.
    totalCount: reviewThreads.totalCount,
    returnedCount: threads.length,
    hasNextPage: reviewThreads.pageInfo.hasNextPage,
    endCursor: reviewThreads.pageInfo.endCursor,
    threads,
  }
  })
}

export const replyToReviewCommentInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
  commentId: z.number().describe('commentId of the thread\'s first comment, from listPullRequestReviewThreads'),
  body: z.string().describe('Reply text (supports Markdown)'),
})

export const replyToReviewCommentDescription = 'Reply to a pull request review comment, adding a message to its review thread'

/** Not idempotent — each call posts a new reply. */
export async function replyToReviewCommentCore({ token, owner, repo, pullNumber, commentId, body }: { token: string, owner: string, repo: string, pullNumber: number, commentId: number, body: string }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.pulls.createReplyForReviewComment({
    owner,
    repo,
    pull_number: pullNumber,
    comment_id: commentId,
    body,
  })
  return {
    id: data.id,
    url: data.html_url,
    author: data.user?.login,
    createdAt: data.created_at,
  }
  })
}

export const resolveReviewThreadInputSchema = z.object({
  threadId: z.string().describe('Review thread ID (threadId from listPullRequestReviewThreads)'),
})

export const resolveReviewThreadDescription = 'Mark a pull request review thread as resolved'

const RESOLVE_THREAD_MUTATION = /* GraphQL */ `
  mutation ResolveReviewThread($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread {
        id
        isResolved
      }
    }
  }
`

/** Idempotent — resolving an already-resolved thread is a no-op on GitHub. */
export async function resolveReviewThreadCore({ token, threadId }: { token: string, threadId: string }) {
  return withOctokit(token, async (octokit) => {
  const data = (await octokit.graphql(RESOLVE_THREAD_MUTATION, { threadId })) as {
    resolveReviewThread: { thread: { id: string, isResolved: boolean } | null } | null
  }

  const thread = data.resolveReviewThread?.thread
  if (!thread) {
    return { error: `Review thread not found: ${threadId}` }
  }
  return { threadId: thread.id, isResolved: thread.isResolved }
  })
}

export const requestReviewersInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
  reviewers: z.array(z.string()).optional().describe('GitHub usernames to request a review from'),
  teamReviewers: z.array(z.string()).optional().describe('Team slugs to request a review from'),
})

export const requestReviewersDescription = 'Request reviews from users or teams on a pull request'

/** Not idempotent — re-requesting an existing reviewer is a no-op on GitHub but still mutates. */
export async function requestReviewersCore({ token, owner, repo, pullNumber, reviewers, teamReviewers }: { token: string, owner: string, repo: string, pullNumber: number, reviewers?: string[], teamReviewers?: string[] }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.pulls.requestReviewers({
    owner,
    repo,
    pull_number: pullNumber,
    reviewers,
    team_reviewers: teamReviewers,
  })
  return {
    number: data.number,
    url: data.html_url,
    requestedReviewers: data.requested_reviewers?.map(r => r.login),
    requestedTeams: data.requested_teams?.map(t => t.slug),
  }
  })
}
