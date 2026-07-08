import { tool } from 'ai'
import {
  listIssuesInputSchema,
  listIssuesDescription,
  listIssuesCore,
  getIssueInputSchema,
  getIssueDescription,
  getIssueCore,
  createIssueInputSchema,
  createIssueDescription,
  createIssueCore,
  addIssueCommentInputSchema,
  addIssueCommentDescription,
  addIssueCommentCore,
  closeIssueInputSchema,
  closeIssueDescription,
  closeIssueCore,
  listLabelsInputSchema,
  listLabelsDescription,
  listLabelsCore,
  addLabelsInputSchema,
  addLabelsDescription,
  addLabelsCore,
  removeLabelInputSchema,
  removeLabelDescription,
  removeLabelCore,
} from '../core/issues'
import { createGithubTokenStepResolver, type GithubTokenResolver, type GithubTokenStepArgs } from '../core/token'
import type { GithubTool, ToolOptions } from '../types'

async function listIssuesStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof listIssuesCore>[0]>) {
  "use step"
  return listIssuesCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** List issues for a GitHub repository (excludes pull requests). */
export const listIssues = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: listIssuesDescription,
    inputSchema: listIssuesInputSchema,
    execute: async args => listIssuesStep({ token: await resolveToken(), ...args }),
  })

async function getIssueStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof getIssueCore>[0]>) {
  "use step"
  return getIssueCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Get detailed information about a specific issue. */
export const getIssue = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: getIssueDescription,
    inputSchema: getIssueInputSchema,
    execute: async args => getIssueStep({ token: await resolveToken(), ...args }),
  })

async function createIssueStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof createIssueCore>[0]>) {
  "use step"
  return createIssueCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Create a new issue in a GitHub repository. Requires approval by default. */
export const createIssue = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createIssueDescription,
    needsApproval,
    inputSchema: createIssueInputSchema,
    execute: async args => createIssueStep({ token: await resolveToken(), ...args }),
  })

async function addIssueCommentStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof addIssueCommentCore>[0]>) {
  "use step"
  return addIssueCommentCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Add a comment to a GitHub issue. Requires approval by default. */
export const addIssueComment = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: addIssueCommentDescription,
    needsApproval,
    inputSchema: addIssueCommentInputSchema,
    execute: async args => addIssueCommentStep({ token: await resolveToken(), ...args }),
  })

async function closeIssueStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof closeIssueCore>[0]>) {
  "use step"
  return closeIssueCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Close an open GitHub issue. Requires approval by default. */
export const closeIssue = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: closeIssueDescription,
    needsApproval,
    inputSchema: closeIssueInputSchema,
    execute: async args => closeIssueStep({ token: await resolveToken(), ...args }),
  })

async function listLabelsStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof listLabelsCore>[0]>) {
  "use step"
  return listLabelsCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** List labels available in a GitHub repository. */
export const listLabels = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: listLabelsDescription,
    inputSchema: listLabelsInputSchema,
    execute: async args => listLabelsStep({ token: await resolveToken(), ...args }),
  })

async function addLabelsStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof addLabelsCore>[0]>) {
  "use step"
  return addLabelsCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Add labels to an issue or pull request. Requires approval by default. */
export const addLabels = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: addLabelsDescription,
    needsApproval,
    inputSchema: addLabelsInputSchema,
    execute: async args => addLabelsStep({ token: await resolveToken(), ...args }),
  })

async function removeLabelStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof removeLabelCore>[0]>) {
  "use step"
  return removeLabelCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Remove a label from an issue or pull request. Requires approval by default. */
export const removeLabel = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: removeLabelDescription,
    needsApproval,
    inputSchema: removeLabelInputSchema,
    execute: async args => removeLabelStep({ token: await resolveToken(), ...args }),
  })
