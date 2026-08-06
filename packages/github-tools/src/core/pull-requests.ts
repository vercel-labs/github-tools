import { z } from 'zod'
import { createOctokit } from '../client'
import type { CommitIdentity } from '../types'
import { applyDetailBody, detailSchema, type DetailLevel } from './detail'
import { fetchAllPages, maxPagesSchema } from './pagination'
import { composeCommitMessage } from './repository'

export const listPullRequestsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  state: z.enum(['open', 'closed', 'all']).optional().default('open').describe('Filter by state'),
  perPage: z.number().optional().default(30).describe('Number of results to return per page (max 100)'),
  maxPages: maxPagesSchema,
})

export const listPullRequestsDescription = 'List pull requests for a GitHub repository'

export async function listPullRequestsCore({ token, owner, repo, state, perPage, maxPages }: { token: string, owner: string, repo: string, state: 'open' | 'closed' | 'all', perPage: number, maxPages?: number }) {
  const octokit = createOctokit(token)
  const pullRequests = await fetchAllPages(async page => {
    const { data } = await octokit.rest.pulls.list({ owner, repo, state, per_page: perPage, page })
    return data
  }, perPage, maxPages)
  return pullRequests.map(pr => ({
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
  }))
}

export const getPullRequestInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
  detail: detailSchema,
})

export const getPullRequestDescription = 'Get detailed information about a specific pull request. Body is truncated by default (detail: summary) — set detail full for the complete description'

export async function getPullRequestCore({ token, owner, repo, pullNumber, detail = 'summary' }: { token: string, owner: string, repo: string, pullNumber: number, detail?: DetailLevel }) {
  const octokit = createOctokit(token)
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
  const octokit = createOctokit(token)
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
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.pulls.update({ owner, repo, pull_number: pullNumber, title, body, state, base })

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
  const octokit = createOctokit(token)
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
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.createComment({ owner, repo, issue_number: pullNumber, body })
  return {
    id: data.id,
    url: data.html_url,
    body: data.body,
    author: data.user?.login,
    createdAt: data.created_at,
  }
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
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.updateComment({ owner, repo, comment_id: commentId, body })
  return {
    id: data.id,
    url: data.html_url,
    body: data.body,
    updatedAt: data.updated_at,
  }
}

export const deletePullRequestCommentInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  commentId: z.number().describe('Comment ID to delete'),
})

export const deletePullRequestCommentDescription = 'Delete a comment from a pull request permanently'

/** Not idempotent — deleting an already-deleted comment returns 404 from GitHub. */
export async function deletePullRequestCommentCore({ token, owner, repo, commentId }: { token: string, owner: string, repo: string, commentId: number }) {
  const octokit = createOctokit(token)
  await octokit.rest.issues.deleteComment({ owner, repo, comment_id: commentId })
  return { deleted: true, commentId }
}

export const listPullRequestFilesInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
  includePatch: z.boolean().optional().default(false).describe('Include diff patches (token-heavy). Prefer false for an overview, then set true with filenames to fetch specific diffs'),
  filenames: z.array(z.string()).optional().describe('If set, only return these file paths (useful with includePatch: true for targeted diffs)'),
  perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
  page: z.number().optional().default(1).describe('Page number for pagination'),
})

export const listPullRequestFilesDescription = 'List files changed in a pull request with status and stats. Patches are omitted by default — set includePatch true (optionally with filenames) to fetch diffs'

export async function listPullRequestFilesCore({ token, owner, repo, pullNumber, includePatch, filenames, perPage, page }: { token: string, owner: string, repo: string, pullNumber: number, includePatch: boolean, filenames?: string[], perPage: number, page: number }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.pulls.listFiles({ owner, repo, pull_number: pullNumber, per_page: perPage, page })
  const filenameSet = filenames?.length ? new Set(filenames) : null
  return data
    .filter(file => !filenameSet || filenameSet.has(file.filename))
    .map(file => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      ...includePatch && file.patch != null ? { patch: file.patch } : {},
    }))
}

export const listPullRequestReviewsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
  perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
  page: z.number().optional().default(1).describe('Page number for pagination'),
})

export const listPullRequestReviewsDescription = 'List reviews on a pull request (approvals, change requests, and comments)'

export async function listPullRequestReviewsCore({ token, owner, repo, pullNumber, perPage, page }: { token: string, owner: string, repo: string, pullNumber: number, perPage: number, page: number }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.pulls.listReviews({ owner, repo, pull_number: pullNumber, per_page: perPage, page })
  return data.map(review => ({
    id: review.id,
    state: review.state,
    body: review.body,
    author: review.user?.login,
    url: review.html_url,
    submittedAt: review.submitted_at,
  }))
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
  const octokit = createOctokit(token)
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
  const octokit = createOctokit(token)
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
}
