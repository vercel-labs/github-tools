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
import { createGithubTokenStepResolver, type GithubTokenResolver, type GithubTokenStepArgs } from '../core/token'
import type { CommitIdentity, GithubTool, ToolOptions } from '../types'

export type MergeToolOptions = ToolOptions & {
  coAuthors?: CommitIdentity[]
}

async function listPullRequestsStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof listPullRequestsCore>[0]>) {
  "use step"
  return listPullRequestsCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** List pull requests for a GitHub repository. */
export const listPullRequests = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: listPullRequestsDescription,
    inputSchema: listPullRequestsInputSchema,
    execute: async args => listPullRequestsStep({ token: await resolveToken(), ...args }),
  })

async function getPullRequestStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof getPullRequestCore>[0]>) {
  "use step"
  return getPullRequestCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Get detailed information about a specific pull request. */
export const getPullRequest = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: getPullRequestDescription,
    inputSchema: getPullRequestInputSchema,
    execute: async args => getPullRequestStep({ token: await resolveToken(), ...args }),
  })

async function createPullRequestStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof createPullRequestCore>[0]>) {
  "use step"
  return createPullRequestCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Create a new pull request in a GitHub repository. Requires approval by default. */
export const createPullRequest = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createPullRequestDescription,
    needsApproval,
    inputSchema: createPullRequestInputSchema,
    execute: async args => createPullRequestStep({ token: await resolveToken(), ...args }),
  })

async function mergePullRequestStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof mergePullRequestCore>[0]>) {
  "use step"
  return mergePullRequestCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Merge a pull request. Requires approval by default. */
export const mergePullRequest = (resolveToken: GithubTokenResolver, { needsApproval = true, coAuthors }: MergeToolOptions = {}): GithubTool =>
  tool({
    description: mergePullRequestDescription,
    needsApproval,
    inputSchema: mergePullRequestInputSchema,
    execute: async args => mergePullRequestStep({ token: await resolveToken(), coAuthors, ...args }),
  })

async function addPullRequestCommentStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof addPullRequestCommentCore>[0]>) {
  "use step"
  return addPullRequestCommentCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Add a comment to a pull request. Requires approval by default. */
export const addPullRequestComment = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: addPullRequestCommentDescription,
    needsApproval,
    inputSchema: addPullRequestCommentInputSchema,
    execute: async args => addPullRequestCommentStep({ token: await resolveToken(), ...args }),
  })

async function listPullRequestFilesStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof listPullRequestFilesCore>[0]>) {
  "use step"
  return listPullRequestFilesCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** List files changed in a pull request, including diff status and patch content. */
export const listPullRequestFiles = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: listPullRequestFilesDescription,
    inputSchema: listPullRequestFilesInputSchema,
    toModelOutput: listPullRequestFilesToModelOutput,
    execute: async args => listPullRequestFilesStep({ token: await resolveToken(), ...args }),
  })

async function listPullRequestReviewsStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof listPullRequestReviewsCore>[0]>) {
  "use step"
  return listPullRequestReviewsCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** List reviews on a pull request (approvals, change requests, and comments). */
export const listPullRequestReviews = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: listPullRequestReviewsDescription,
    inputSchema: listPullRequestReviewsInputSchema,
    execute: async args => listPullRequestReviewsStep({ token: await resolveToken(), ...args }),
  })

async function createPullRequestReviewStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof createPullRequestReviewCore>[0]>) {
  "use step"
  return createPullRequestReviewCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Submit a pull request review with optional inline comments. Requires approval by default. */
export const createPullRequestReview = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createPullRequestReviewDescription,
    needsApproval,
    inputSchema: createPullRequestReviewInputSchema,
    execute: async args => createPullRequestReviewStep({ token: await resolveToken(), ...args }),
  })
