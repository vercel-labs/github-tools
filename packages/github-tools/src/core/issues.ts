import { z } from 'zod'
import { createOctokit } from '../client'

export const listIssuesInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  state: z.enum(['open', 'closed', 'all']).optional().default('open').describe('Filter by state'),
  labels: z.string().optional().describe('Comma-separated list of label names to filter by'),
  perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
})

export const listIssuesDescription = 'List issues for a GitHub repository (excludes pull requests)'

export async function listIssuesCore({ token, owner, repo, state, labels, perPage }: { token: string, owner: string, repo: string, state: 'open' | 'closed' | 'all', labels?: string, perPage: number }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    state,
    labels,
    per_page: perPage,
  })
  return data
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
})

export const getIssueDescription = 'Get detailed information about a specific issue'

export async function getIssueCore({ token, owner, repo, issueNumber }: { token: string, owner: string, repo: string, issueNumber: number }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.get({ owner, repo, issue_number: issueNumber })
  return {
    number: data.number,
    title: data.title,
    body: data.body,
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
