import { z } from 'zod'
import { createOctokit } from '../client'
import { applyDetailBody, detailSchema, type DetailLevel } from './detail'
import { fetchAllPages, maxPagesSchema } from './pagination'

export const listIssuesInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  state: z.enum(['open', 'closed', 'all']).optional().default('open').describe('Filter by state'),
  labels: z.string().optional().describe('Comma-separated list of label names to filter by'),
  perPage: z.number().optional().default(30).describe('Number of results to return per page (max 100)'),
  maxPages: maxPagesSchema,
})

export const listIssuesDescription = 'List issues for a GitHub repository (excludes pull requests)'

export async function listIssuesCore({ token, owner, repo, state, labels, perPage, maxPages }: { token: string, owner: string, repo: string, state: 'open' | 'closed' | 'all', labels?: string, perPage: number, maxPages?: number }) {
  const octokit = createOctokit(token)
  const issues = await fetchAllPages(async page => {
    const { data } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state,
      labels,
      per_page: perPage,
      page,
    })
    return data
  }, perPage, maxPages)
  return issues
    .filter(issue => !issue.pull_request)
    .map(issue => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      url: issue.html_url,
      author: issue.user?.login,
      labels: issue.labels.map(l => (typeof l === 'string' ? l : l.name)),
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
    }))
}

export const getIssueInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issueNumber: z.number().describe('Issue number'),
  detail: detailSchema,
})

export const getIssueDescription = 'Get detailed information about a specific issue. Body is truncated by default (detail: summary) — set detail full for the complete description'

export async function getIssueCore({ token, owner, repo, issueNumber, detail = 'summary' }: { token: string, owner: string, repo: string, issueNumber: number, detail?: DetailLevel }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.get({ owner, repo, issue_number: issueNumber })
  return {
    number: data.number,
    title: data.title,
    body: applyDetailBody(data.body, detail),
    state: data.state,
    url: data.html_url,
    author: data.user?.login,
    assignees: data.assignees?.map(a => a.login),
    labels: data.labels.map(l => (typeof l === 'string' ? l : l.name)),
    comments: data.comments,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    closedAt: data.closed_at,
  }
}

export const listIssueCommentsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issueNumber: z.number().describe('Issue number'),
  perPage: z.number().optional().default(30).describe('Number of comments to return (max 100)'),
  page: z.number().optional().default(1).describe('Page number for pagination'),
  detail: detailSchema,
})

export const listIssueCommentsDescription = 'List comments on a GitHub issue. Bodies are truncated by default (detail: summary)'

export async function listIssueCommentsCore({ token, owner, repo, issueNumber, perPage, page, detail = 'summary' }: { token: string, owner: string, repo: string, issueNumber: number, perPage: number, page: number, detail?: DetailLevel }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.listComments({ owner, repo, issue_number: issueNumber, per_page: perPage, page })
  return data.map(comment => ({
    id: comment.id,
    url: comment.html_url,
    body: applyDetailBody(comment.body, detail),
    author: comment.user?.login,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
  }))
}

export const createIssueInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  title: z.string().describe('Issue title'),
  body: z.string().optional().describe('Issue description (supports Markdown)'),
  labels: z.array(z.string()).optional().describe('Labels to apply to the issue'),
  assignees: z.array(z.string()).optional().describe('GitHub usernames to assign to the issue'),
})

export const createIssueDescription = 'Create a new issue in a GitHub repository'

/** Not idempotent — each call creates a new issue. */
export async function createIssueCore({ token, owner, repo, title, body, labels, assignees }: { token: string, owner: string, repo: string, title: string, body?: string, labels?: string[], assignees?: string[] }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.create({ owner, repo, title, body, labels, assignees })
  return {
    number: data.number,
    title: data.title,
    url: data.html_url,
    state: data.state,
    labels: data.labels.map(l => (typeof l === 'string' ? l : l.name)),
  }
}

export const addIssueCommentInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issueNumber: z.number().describe('Issue number'),
  body: z.string().describe('Comment text (supports Markdown)'),
})

export const addIssueCommentDescription = 'Add a comment to a GitHub issue'

/** Not idempotent — each call adds another comment. */
export async function addIssueCommentCore({ token, owner, repo, issueNumber, body }: { token: string, owner: string, repo: string, issueNumber: number, body: string }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body })
  return {
    id: data.id,
    url: data.html_url,
    body: data.body,
    author: data.user?.login,
    createdAt: data.created_at,
  }
}

export const closeIssueInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issueNumber: z.number().describe('Issue number to close'),
  stateReason: z.enum(['completed', 'not_planned']).optional().default('completed').describe('Reason for closing'),
})

export const closeIssueDescription = 'Close an open GitHub issue'

/** Idempotent when the issue is already closed. */
export async function closeIssueCore({ token, owner, repo, issueNumber, stateReason }: { token: string, owner: string, repo: string, issueNumber: number, stateReason: 'completed' | 'not_planned' }) {
  const octokit = createOctokit(token)
  const { data: existing } = await octokit.rest.issues.get({ owner, repo, issue_number: issueNumber })
  if (existing.state === 'closed') {
    return {
      number: existing.number,
      title: existing.title,
      state: existing.state,
      url: existing.html_url,
      closedAt: existing.closed_at,
    }
  }

  const { data } = await octokit.rest.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    state: 'closed',
    state_reason: stateReason,
  })
  return {
    number: data.number,
    title: data.title,
    state: data.state,
    url: data.html_url,
    closedAt: data.closed_at,
  }
}

export const updateIssueInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issueNumber: z.number().describe('Issue number'),
  title: z.string().optional().describe('New issue title'),
  body: z.string().optional().describe('New issue description (supports Markdown)'),
  state: z.enum(['open', 'closed']).optional().describe('Open or close the issue — set open to reopen a closed issue, closed to close it'),
  stateReason: z.enum(['completed', 'not_planned', 'reopened']).optional().describe('Reason for the state change (ignored unless state changes)'),
  labels: z.array(z.string()).optional().describe('Labels to set on the issue — replaces the existing set'),
  milestone: z.number().nullable().optional().describe('Milestone number to associate, or null to remove the milestone'),
  assignees: z.array(z.string()).optional().describe('GitHub usernames to set as assignees — replaces the existing set'),
})

export const updateIssueDescription = 'Update a GitHub issue — title, body, labels, milestone, or assignees. Set state open to reopen a closed issue, or closed to close it'

/** Not idempotent — each call applies a new revision. */
export async function updateIssueCore({ token, owner, repo, issueNumber, title, body, state, stateReason, labels, milestone, assignees }: { token: string, owner: string, repo: string, issueNumber: number, title?: string, body?: string, state?: 'open' | 'closed', stateReason?: 'completed' | 'not_planned' | 'reopened', labels?: string[], milestone?: number | null, assignees?: string[] }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    title,
    body,
    state,
    state_reason: stateReason,
    labels,
    milestone,
    assignees,
  })
  return {
    number: data.number,
    title: data.title,
    state: data.state,
    url: data.html_url,
    labels: data.labels.map(l => (typeof l === 'string' ? l : l.name)),
    assignees: data.assignees?.map(a => a.login),
    milestone: data.milestone?.number ?? null,
    closedAt: data.closed_at,
    updatedAt: data.updated_at,
  }
}

export const updateIssueCommentInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  commentId: z.number().describe('Comment ID (from listIssueComments)'),
  body: z.string().describe('New comment text (supports Markdown)'),
})

export const updateIssueCommentDescription = 'Update the body of a comment on a GitHub issue'

/** Not idempotent — each call applies a new revision. */
export async function updateIssueCommentCore({ token, owner, repo, commentId, body }: { token: string, owner: string, repo: string, commentId: number, body: string }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.updateComment({ owner, repo, comment_id: commentId, body })
  return {
    id: data.id,
    url: data.html_url,
    body: data.body,
    updatedAt: data.updated_at,
  }
}

export const deleteIssueCommentInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  commentId: z.number().describe('Comment ID to delete'),
})

export const deleteIssueCommentDescription = 'Delete a comment from a GitHub issue permanently'

/** Not idempotent — deleting an already-deleted comment returns 404 from GitHub. */
export async function deleteIssueCommentCore({ token, owner, repo, commentId }: { token: string, owner: string, repo: string, commentId: number }) {
  const octokit = createOctokit(token)
  await octokit.rest.issues.deleteComment({ owner, repo, comment_id: commentId })
  return { deleted: true, commentId }
}

export const listLabelsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
  page: z.number().optional().default(1).describe('Page number for pagination'),
})

export const listLabelsDescription = 'List labels available in a GitHub repository'

export async function listLabelsCore({ token, owner, repo, perPage, page }: { token: string, owner: string, repo: string, perPage: number, page: number }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.listLabelsForRepo({ owner, repo, per_page: perPage, page })
  return data.map(label => ({
    name: label.name,
    color: label.color,
    description: label.description,
  }))
}

export const addLabelsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issueNumber: z.number().describe('Issue or pull request number'),
  labels: z.array(z.string()).describe('Label names to add'),
})

export const addLabelsDescription = 'Add labels to an issue or pull request'

/** Not idempotent — re-adding labels is a no-op on GitHub but still mutates. */
export async function addLabelsCore({ token, owner, repo, issueNumber, labels }: { token: string, owner: string, repo: string, issueNumber: number, labels: string[] }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.addLabels({ owner, repo, issue_number: issueNumber, labels })
  return data.map(label => ({
    name: label.name,
    color: label.color,
    description: label.description,
  }))
}

export const removeLabelInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issueNumber: z.number().describe('Issue or pull request number'),
  label: z.string().describe('Label name to remove'),
})

export const removeLabelDescription = 'Remove a label from an issue or pull request'

/** Not idempotent — removing a missing label returns 404 from GitHub. */
export async function removeLabelCore({ token, owner, repo, issueNumber, label }: { token: string, owner: string, repo: string, issueNumber: number, label: string }) {
  const octokit = createOctokit(token)
  await octokit.rest.issues.removeLabel({ owner, repo, issue_number: issueNumber, name: label })
  return { removed: true, label, issueNumber }
}

export const createLabelInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  name: z.string().describe('Label name'),
  color: z.string().describe('Label color as 6 hex digits without a leading # (e.g. "d73a4a")'),
  description: z.string().optional().describe('Short label description'),
})

export const createLabelDescription = 'Create a label in a GitHub repository'

/** Not idempotent — creating a label that already exists returns 422 from GitHub. */
export async function createLabelCore({ token, owner, repo, name, color, description }: { token: string, owner: string, repo: string, name: string, color: string, description?: string }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.createLabel({ owner, repo, name, color, description })
  return {
    name: data.name,
    color: data.color,
    description: data.description,
  }
}

export const updateLabelInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  name: z.string().describe('Current label name'),
  newName: z.string().optional().describe('New label name (rename)'),
  color: z.string().optional().describe('New color as 6 hex digits without a leading #'),
  description: z.string().nullable().optional().describe('New description, or null to clear it'),
})

export const updateLabelDescription = 'Update a label in a GitHub repository — name, color, or description'

/** Not idempotent — each call applies a new revision. */
export async function updateLabelCore({ token, owner, repo, name, newName, color, description }: { token: string, owner: string, repo: string, name: string, newName?: string, color?: string, description?: string | null }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.updateLabel({
    owner,
    repo,
    name,
    new_name: newName,
    color,
    description: description === null ? '' : description,
  })
  return {
    name: data.name,
    color: data.color,
    description: data.description,
  }
}

export const deleteLabelInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  name: z.string().describe('Label name to delete'),
})

export const deleteLabelDescription = 'Delete a label from a GitHub repository permanently'

/** Not idempotent — deleting a missing label returns 404 from GitHub. */
export async function deleteLabelCore({ token, owner, repo, name }: { token: string, owner: string, repo: string, name: string }) {
  const octokit = createOctokit(token)
  await octokit.rest.issues.deleteLabel({ owner, repo, name })
  return { deleted: true, name }
}

export const addAssigneesInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issueNumber: z.number().describe('Issue or pull request number'),
  assignees: z.array(z.string()).describe('GitHub usernames to assign'),
})

export const addAssigneesDescription = 'Assign users to an issue or pull request'

/** Not idempotent — re-adding an existing assignee is a no-op on GitHub but still mutates. */
export async function addAssigneesCore({ token, owner, repo, issueNumber, assignees }: { token: string, owner: string, repo: string, issueNumber: number, assignees: string[] }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.addAssignees({ owner, repo, issue_number: issueNumber, assignees })
  return {
    number: data.number,
    assignees: data.assignees?.map(a => a.login),
  }
}

export const removeAssigneesInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issueNumber: z.number().describe('Issue or pull request number'),
  assignees: z.array(z.string()).describe('GitHub usernames to unassign'),
})

export const removeAssigneesDescription = 'Remove assignees from an issue or pull request'

/** Idempotent — removing an assignee that is not assigned is a no-op on GitHub. */
export async function removeAssigneesCore({ token, owner, repo, issueNumber, assignees }: { token: string, owner: string, repo: string, issueNumber: number, assignees: string[] }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.removeAssignees({ owner, repo, issue_number: issueNumber, assignees })
  return {
    number: data.number,
    assignees: data.assignees?.map(a => a.login),
  }
}
