import { tool } from 'ai'
import type { ToolOptions, GithubTool } from '../types'
import {
  listCommitsInputSchema,
  listCommitsDescription,
  listCommitsCore,
  getCommitInputSchema,
  getCommitDescription,
  getCommitCore,
  getBlameInputSchema,
  getBlameDescription,
  getBlameCore,
  getCommitCommentInputSchema,
  getCommitCommentDescription,
  getCommitCommentCore,
  listCommitCommentsInputSchema,
  listCommitCommentsDescription,
  listCommitCommentsCore,
  createCommitCommentInputSchema,
  createCommitCommentDescription,
  createCommitCommentCore,
  updateCommitCommentInputSchema,
  updateCommitCommentDescription,
  updateCommitCommentCore,
  deleteCommitCommentInputSchema,
  deleteCommitCommentDescription,
  deleteCommitCommentCore,
} from '../core/commits'
import { getCommitToModelOutput } from '../core/model-output'

async function listCommitsStep(args: Parameters<typeof listCommitsCore>[0]) {
  "use step"
  return listCommitsCore(args)
}

/** List commits for a GitHub repository. Filter by file path to see commits that touched a file. */
export const listCommits = (token: string): GithubTool =>
  tool({
    description: listCommitsDescription,
    inputSchema: listCommitsInputSchema,
    execute: async args => listCommitsStep({ token, ...args }),
  })

async function getCommitStep(args: Parameters<typeof getCommitCore>[0]) {
  "use step"
  return getCommitCore(args)
}

/** Get detailed information about a specific commit, including files changed with additions and deletions. */
export const getCommit = (token: string): GithubTool =>
  tool({
    description: getCommitDescription,
    inputSchema: getCommitInputSchema,
    toModelOutput: getCommitToModelOutput,
    execute: async args => getCommitStep({ token, ...args }),
  })

async function getBlameStep(args: Parameters<typeof getBlameCore>[0]) {
  "use step"
  return getBlameCore(args)
}

/** Line-level git blame for a file at a commit-like ref (branch, tag, or SHA). */
export const getBlame = (token: string): GithubTool =>
  tool({
    description: getBlameDescription,
    inputSchema: getBlameInputSchema,
    execute: async args => getBlameStep({ token, ...args }),
  })

async function getCommitCommentStep(args: Parameters<typeof getCommitCommentCore>[0]) {
  "use step"
  return getCommitCommentCore(args)
}

/** Get a single commit comment by its ID. */
export const getCommitComment = (token: string): GithubTool =>
  tool({
    description: getCommitCommentDescription,
    inputSchema: getCommitCommentInputSchema,
    execute: async args => getCommitCommentStep({ token, ...args }),
  })

async function listCommitCommentsStep(args: Parameters<typeof listCommitCommentsCore>[0]) {
  "use step"
  return listCommitCommentsCore(args)
}

/** List comments left on a specific commit. */
export const listCommitComments = (token: string): GithubTool =>
  tool({
    description: listCommitCommentsDescription,
    inputSchema: listCommitCommentsInputSchema,
    execute: async args => listCommitCommentsStep({ token, ...args }),
  })

async function createCommitCommentStep(args: Parameters<typeof createCommitCommentCore>[0]) {
  "use step"
  return createCommitCommentCore(args)
}

/** Add a comment to a commit. Requires approval by default. */
export const createCommitComment = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createCommitCommentDescription,
    needsApproval,
    inputSchema: createCommitCommentInputSchema,
    execute: async args => createCommitCommentStep({ token, ...args }),
  })

async function updateCommitCommentStep(args: Parameters<typeof updateCommitCommentCore>[0]) {
  "use step"
  return updateCommitCommentCore(args)
}

/** Update the body of an existing commit comment. Requires approval by default. */
export const updateCommitComment = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: updateCommitCommentDescription,
    needsApproval,
    inputSchema: updateCommitCommentInputSchema,
    execute: async args => updateCommitCommentStep({ token, ...args }),
  })

async function deleteCommitCommentStep(args: Parameters<typeof deleteCommitCommentCore>[0]) {
  "use step"
  return deleteCommitCommentCore(args)
}

/** Delete a commit comment permanently. Requires approval by default. */
export const deleteCommitComment = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: deleteCommitCommentDescription,
    needsApproval,
    inputSchema: deleteCommitCommentInputSchema,
    execute: async args => deleteCommitCommentStep({ token, ...args }),
  })
