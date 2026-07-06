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
import type { CommitIdentity, ToolOptions, GithubTool } from '../types'

export type MergeToolOptions = ToolOptions & {
  coAuthors?: CommitIdentity[]
}

async function listPullRequestsStep(args: Parameters<typeof listPullRequestsCore>[0]) {
  "use step"
  return listPullRequestsCore(args)
}

export const listPullRequests = (token: string): GithubTool =>
  tool({
    description: listPullRequestsDescription,
    inputSchema: listPullRequestsInputSchema,
    execute: async args => listPullRequestsStep({ token, ...args }),
  })

async function getPullRequestStep(args: Parameters<typeof getPullRequestCore>[0]) {
  "use step"
  return getPullRequestCore(args)
}

export const getPullRequest = (token: string): GithubTool =>
  tool({
    description: getPullRequestDescription,
    inputSchema: getPullRequestInputSchema,
    execute: async args => getPullRequestStep({ token, ...args }),
  })

async function createPullRequestStep(args: Parameters<typeof createPullRequestCore>[0]) {
  "use step"
  return createPullRequestCore(args)
}

export const createPullRequest = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createPullRequestDescription,
    needsApproval,
    inputSchema: createPullRequestInputSchema,
    execute: async args => createPullRequestStep({ token, ...args }),
  })

async function mergePullRequestStep(args: Parameters<typeof mergePullRequestCore>[0]) {
  "use step"
  return mergePullRequestCore(args)
}

export const mergePullRequest = (token: string, { needsApproval = true, coAuthors }: MergeToolOptions = {}): GithubTool =>
  tool({
    description: mergePullRequestDescription,
    needsApproval,
    inputSchema: mergePullRequestInputSchema,
    execute: async args => mergePullRequestStep({ token, coAuthors, ...args }),
  })

async function addPullRequestCommentStep(args: Parameters<typeof addPullRequestCommentCore>[0]) {
  "use step"
  return addPullRequestCommentCore(args)
}

export const addPullRequestComment = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: addPullRequestCommentDescription,
    needsApproval,
    inputSchema: addPullRequestCommentInputSchema,
    execute: async args => addPullRequestCommentStep({ token, ...args }),
  })

async function listPullRequestFilesStep(args: Parameters<typeof listPullRequestFilesCore>[0]) {
  "use step"
  return listPullRequestFilesCore(args)
}

export const listPullRequestFiles = (token: string): GithubTool =>
  tool({
    description: listPullRequestFilesDescription,
    inputSchema: listPullRequestFilesInputSchema,
    toModelOutput: listPullRequestFilesToModelOutput,
    execute: async args => listPullRequestFilesStep({ token, ...args }),
  })

async function listPullRequestReviewsStep(args: Parameters<typeof listPullRequestReviewsCore>[0]) {
  "use step"
  return listPullRequestReviewsCore(args)
}

export const listPullRequestReviews = (token: string): GithubTool =>
  tool({
    description: listPullRequestReviewsDescription,
    inputSchema: listPullRequestReviewsInputSchema,
    execute: async args => listPullRequestReviewsStep({ token, ...args }),
  })

async function createPullRequestReviewStep(args: Parameters<typeof createPullRequestReviewCore>[0]) {
  "use step"
  return createPullRequestReviewCore(args)
}

export const createPullRequestReview = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createPullRequestReviewDescription,
    needsApproval,
    inputSchema: createPullRequestReviewInputSchema,
    execute: async args => createPullRequestReviewStep({ token, ...args }),
  })
