import { tool } from 'ai'
import {
  listPullRequestsInputSchema,
  listPullRequestsDescription,
  listPullRequestsCore,
  getPullRequestInputSchema,
  getPullRequestDescription,
  getPullRequestCore,
  createPullRequestInputSchema,
  createPullRequestDescription,
  createPullRequestCore,
  mergePullRequestInputSchema,
  mergePullRequestDescription,
  mergePullRequestCore,
  addPullRequestCommentInputSchema,
  addPullRequestCommentDescription,
  addPullRequestCommentCore,
  listPullRequestFilesInputSchema,
  listPullRequestFilesDescription,
  listPullRequestFilesCore,
  listPullRequestReviewsInputSchema,
  listPullRequestReviewsDescription,
  listPullRequestReviewsCore,
  createPullRequestReviewInputSchema,
  createPullRequestReviewDescription,
  createPullRequestReviewCore,
} from '../core/pull-requests'
import { listPullRequestFilesToModelOutput } from '../core/model-output'
import { resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { CommitIdentity, ToolOptions, GithubTool } from '../types'

export type MergeToolOptions = ToolOptions & {
  coAuthors?: CommitIdentity[]
}

async function listPullRequestsStep(args: Parameters<typeof listPullRequestsCore>[0]) {
  "use step"
  return listPullRequestsCore(args)
}

/** List pull requests for a GitHub repository. */
export const listPullRequests = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listPullRequestsDescription,
    inputSchema: listPullRequestsInputSchema,
    execute: async args => listPullRequestsStep({ token: await resolveGithubToken(token), ...args }),
  })

async function getPullRequestStep(args: Parameters<typeof getPullRequestCore>[0]) {
  "use step"
  return getPullRequestCore(args)
}

/** Get detailed information about a specific pull request. */
export const getPullRequest = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getPullRequestDescription,
    inputSchema: getPullRequestInputSchema,
    execute: async args => getPullRequestStep({ token: await resolveGithubToken(token), ...args }),
  })

async function createPullRequestStep(args: Parameters<typeof createPullRequestCore>[0]) {
  "use step"
  return createPullRequestCore(args)
}

/** Create a new pull request in a GitHub repository. Requires approval by default. */
export const createPullRequest = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createPullRequestDescription,
    needsApproval,
    inputSchema: createPullRequestInputSchema,
    execute: async args => createPullRequestStep({ token: await resolveGithubToken(token), ...args }),
  })

async function mergePullRequestStep(args: Parameters<typeof mergePullRequestCore>[0]) {
  "use step"
  return mergePullRequestCore(args)
}

/** Merge a pull request. Requires approval by default. */
export const mergePullRequest = (token: GithubTokenInput, { needsApproval = true, coAuthors }: MergeToolOptions = {}): GithubTool =>
  tool({
    description: mergePullRequestDescription,
    needsApproval,
    inputSchema: mergePullRequestInputSchema,
    execute: async args => mergePullRequestStep({ token: await resolveGithubToken(token), coAuthors, ...args }),
  })

async function addPullRequestCommentStep(args: Parameters<typeof addPullRequestCommentCore>[0]) {
  "use step"
  return addPullRequestCommentCore(args)
}

/** Add a comment to a pull request. Requires approval by default. */
export const addPullRequestComment = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: addPullRequestCommentDescription,
    needsApproval,
    inputSchema: addPullRequestCommentInputSchema,
    execute: async args => addPullRequestCommentStep({ token: await resolveGithubToken(token), ...args }),
  })

async function listPullRequestFilesStep(args: Parameters<typeof listPullRequestFilesCore>[0]) {
  "use step"
  return listPullRequestFilesCore(args)
}

/** List files changed in a pull request, including diff status and patch content. */
export const listPullRequestFiles = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listPullRequestFilesDescription,
    inputSchema: listPullRequestFilesInputSchema,
    toModelOutput: listPullRequestFilesToModelOutput,
    execute: async args => listPullRequestFilesStep({ token: await resolveGithubToken(token), ...args }),
  })

async function listPullRequestReviewsStep(args: Parameters<typeof listPullRequestReviewsCore>[0]) {
  "use step"
  return listPullRequestReviewsCore(args)
}

/** List reviews on a pull request (approvals, change requests, and comments). */
export const listPullRequestReviews = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listPullRequestReviewsDescription,
    inputSchema: listPullRequestReviewsInputSchema,
    execute: async args => listPullRequestReviewsStep({ token: await resolveGithubToken(token), ...args }),
  })

async function createPullRequestReviewStep(args: Parameters<typeof createPullRequestReviewCore>[0]) {
  "use step"
  return createPullRequestReviewCore(args)
}

/** Submit a pull request review with optional inline comments. Requires approval by default. */
export const createPullRequestReview = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createPullRequestReviewDescription,
    needsApproval,
    inputSchema: createPullRequestReviewInputSchema,
    execute: async args => createPullRequestReviewStep({ token: await resolveGithubToken(token), ...args }),
  })
