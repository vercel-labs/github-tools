import { tool } from 'ai'
import { z } from 'zod'
import { createOctokit } from '../client'
import type { ToolOptions } from '../types'

async function listPullRequestsStep({ token, owner, repo, state, perPage }: { token: string, owner: string, repo: string, state: 'open' | 'closed' | 'all', perPage: number }) {
  "use step"
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.pulls.list({ owner, repo, state, per_page: perPage })
  return data.map(pr => ({
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

export const listPullRequests = (token: string) =>
  tool({
    description: 'List pull requests for a GitHub repository',
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      state: z.enum(['open', 'closed', 'all']).optional().default('open').describe('Filter by state'),
      perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
    }),
    execute: async args => listPullRequestsStep({ token, ...args }),
  })

async function getPullRequestStep({ token, owner, repo, pullNumber }: { token: string, owner: string, repo: string, pullNumber: number }) {
  "use step"
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber })
  return {
    number: data.number,
    title: data.title,
    body: data.body,
    state: data.state,
    url: data.html_url,
    author: data.user?.login,
    branch: data.head.ref,
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

export const getPullRequest = (token: string) =>
  tool({
    description: 'Get detailed information about a specific pull request',
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pullNumber: z.number().describe('Pull request number'),
    }),
    execute: async args => getPullRequestStep({ token, ...args }),
  })

async function createPullRequestStep({ token, owner, repo, title, body, head, base, draft }: { token: string, owner: string, repo: string, title: string, body?: string, head: string, base: string, draft: boolean }) {
  "use step"
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

export const createPullRequest = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: 'Create a new pull request in a GitHub repository',
    needsApproval,
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      title: z.string().describe('Pull request title'),
      body: z.string().optional().describe('Pull request description (supports Markdown)'),
      head: z.string().describe('Branch containing the changes (format: branch or username:branch)'),
      base: z.string().describe('Branch to merge into'),
      draft: z.boolean().optional().default(false).describe('Create as draft pull request'),
    }),
    execute: async args => createPullRequestStep({ token, ...args }),
  })

async function mergePullRequestStep({ token, owner, repo, pullNumber, commitTitle, commitMessage, mergeMethod }: { token: string, owner: string, repo: string, pullNumber: number, commitTitle?: string, commitMessage?: string, mergeMethod: 'merge' | 'squash' | 'rebase' }) {
  "use step"
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.pulls.merge({
    owner,
    repo,
    pull_number: pullNumber,
    commit_title: commitTitle,
    commit_message: commitMessage,
    merge_method: mergeMethod,
  })
  return {
    merged: data.merged,
    message: data.message,
    sha: data.sha,
  }
}

export const mergePullRequest = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: 'Merge a pull request',
    needsApproval,
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pullNumber: z.number().describe('Pull request number'),
      commitTitle: z.string().optional().describe('Title for the automatic merge commit'),
      commitMessage: z.string().optional().describe('Extra detail to append to automatic commit message'),
      mergeMethod: z.enum(['merge', 'squash', 'rebase']).optional().default('merge').describe('Merge strategy'),
    }),
    execute: async args => mergePullRequestStep({ token, ...args }),
  })

async function addPullRequestCommentStep({ token, owner, repo, pullNumber, body }: { token: string, owner: string, repo: string, pullNumber: number, body: string }) {
  "use step"
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

export const addPullRequestComment = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: 'Add a comment to a pull request',
    needsApproval,
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pullNumber: z.number().describe('Pull request number'),
      body: z.string().describe('Comment text (supports Markdown)'),
    }),
    execute: async args => addPullRequestCommentStep({ token, ...args }),
  })

async function listPullRequestFilesStep({ token, owner, repo, pullNumber, perPage, page }: { token: string, owner: string, repo: string, pullNumber: number, perPage: number, page: number }) {
  "use step"
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.pulls.listFiles({ owner, repo, pull_number: pullNumber, per_page: perPage, page })
  return data.map(file => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch: file.patch,
  }))
}

export const listPullRequestFiles = (token: string) =>
  tool({
    description: 'List files changed in a pull request, including diff status and patch content',
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pullNumber: z.number().describe('Pull request number'),
      perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
      page: z.number().optional().default(1).describe('Page number for pagination'),
    }),
    execute: async args => listPullRequestFilesStep({ token, ...args }),
  })

async function listPullRequestReviewsStep({ token, owner, repo, pullNumber, perPage, page }: { token: string, owner: string, repo: string, pullNumber: number, perPage: number, page: number }) {
  "use step"
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

export const listPullRequestReviews = (token: string) =>
  tool({
    description: 'List reviews on a pull request (approvals, change requests, and comments)',
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pullNumber: z.number().describe('Pull request number'),
      perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
      page: z.number().optional().default(1).describe('Page number for pagination'),
    }),
    execute: async args => listPullRequestReviewsStep({ token, ...args }),
  })

async function createPullRequestReviewStep({ token, owner, repo, pullNumber, body, event, comments }: { token: string, owner: string, repo: string, pullNumber: number, body?: string, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', comments?: Array<{ path: string, body: string, line?: number, side?: 'LEFT' | 'RIGHT' }> }) {
  "use step"
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

export const createPullRequestReview = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: 'Submit a pull request review — approve, request changes, or comment with optional inline comments on specific lines',
    needsApproval,
    inputSchema: z.object({
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
    }),
    execute: async args => createPullRequestReviewStep({ token, ...args }),
  })
