import { tool } from 'ai'
import { z } from 'zod'
import { createOctokit } from '../client'
import type { ToolOptions } from '../types'

async function listIssuesStep({ token, owner, repo, state, labels, perPage }: { token: string, owner: string, repo: string, state: 'open' | 'closed' | 'all', labels?: string, perPage: number }) {
  "use step"
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

export const listIssues = (token: string) =>
  tool({
    description: 'List issues for a GitHub repository (excludes pull requests)',
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      state: z.enum(['open', 'closed', 'all']).optional().default('open').describe('Filter by state'),
      labels: z.string().optional().describe('Comma-separated list of label names to filter by'),
      perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
    }),
    execute: async args => listIssuesStep({ token, ...args }),
  })

async function getIssueStep({ token, owner, repo, issueNumber }: { token: string, owner: string, repo: string, issueNumber: number }) {
  "use step"
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

export const getIssue = (token: string) =>
  tool({
    description: 'Get detailed information about a specific issue',
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue number'),
    }),
    execute: async args => getIssueStep({ token, ...args }),
  })

async function createIssueStep({ token, owner, repo, title, body, labels, assignees }: { token: string, owner: string, repo: string, title: string, body?: string, labels?: string[], assignees?: string[] }) {
  "use step"
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

export const createIssue = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: 'Create a new issue in a GitHub repository',
    needsApproval,
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      title: z.string().describe('Issue title'),
      body: z.string().optional().describe('Issue description (supports Markdown)'),
      labels: z.array(z.string()).optional().describe('Labels to apply to the issue'),
      assignees: z.array(z.string()).optional().describe('GitHub usernames to assign to the issue'),
    }),
    execute: async args => createIssueStep({ token, ...args }),
  })

async function addIssueCommentStep({ token, owner, repo, issueNumber, body }: { token: string, owner: string, repo: string, issueNumber: number, body: string }) {
  "use step"
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

export const addIssueComment = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: 'Add a comment to a GitHub issue',
    needsApproval,
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue number'),
      body: z.string().describe('Comment text (supports Markdown)'),
    }),
    execute: async args => addIssueCommentStep({ token, ...args }),
  })

async function closeIssueStep({ token, owner, repo, issueNumber, stateReason }: { token: string, owner: string, repo: string, issueNumber: number, stateReason: 'completed' | 'not_planned' }) {
  "use step"
  const octokit = createOctokit(token)
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

export const closeIssue = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: 'Close an open GitHub issue',
    needsApproval,
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue number to close'),
      stateReason: z.enum(['completed', 'not_planned']).optional().default('completed').describe('Reason for closing'),
    }),
    execute: async args => closeIssueStep({ token, ...args }),
  })

async function listLabelsStep({ token, owner, repo, perPage, page }: { token: string, owner: string, repo: string, perPage: number, page: number }) {
  "use step"
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.listLabelsForRepo({ owner, repo, per_page: perPage, page })
  return data.map(label => ({
    name: label.name,
    color: label.color,
    description: label.description,
  }))
}

export const listLabels = (token: string) =>
  tool({
    description: 'List labels available in a GitHub repository',
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
      page: z.number().optional().default(1).describe('Page number for pagination'),
    }),
    execute: async args => listLabelsStep({ token, ...args }),
  })

async function addLabelsStep({ token, owner, repo, issueNumber, labels }: { token: string, owner: string, repo: string, issueNumber: number, labels: string[] }) {
  "use step"
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.addLabels({ owner, repo, issue_number: issueNumber, labels })
  return data.map(label => ({
    name: label.name,
    color: label.color,
    description: label.description,
  }))
}

export const addLabels = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: 'Add labels to an issue or pull request',
    needsApproval,
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue or pull request number'),
      labels: z.array(z.string()).describe('Label names to add'),
    }),
    execute: async args => addLabelsStep({ token, ...args }),
  })

async function removeLabelStep({ token, owner, repo, issueNumber, label }: { token: string, owner: string, repo: string, issueNumber: number, label: string }) {
  "use step"
  const octokit = createOctokit(token)
  await octokit.rest.issues.removeLabel({ owner, repo, issue_number: issueNumber, name: label })
  return { removed: true, label, issueNumber }
}

export const removeLabel = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: 'Remove a label from an issue or pull request',
    needsApproval,
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue or pull request number'),
      label: z.string().describe('Label name to remove'),
    }),
    execute: async args => removeLabelStep({ token, ...args }),
  })
