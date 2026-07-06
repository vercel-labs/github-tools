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
import type { ToolOptions, GithubTool } from '../types'

async function listIssuesStep(args: Parameters<typeof listIssuesCore>[0]) {
  "use step"
  return listIssuesCore(args)
}

export const listIssues = (token: string): GithubTool =>
  tool({
    description: listIssuesDescription,
    inputSchema: listIssuesInputSchema,
    execute: async args => listIssuesStep({ token, ...args }),
  })

async function getIssueStep(args: Parameters<typeof getIssueCore>[0]) {
  "use step"
  return getIssueCore(args)
}

export const getIssue = (token: string): GithubTool =>
  tool({
    description: getIssueDescription,
    inputSchema: getIssueInputSchema,
    execute: async args => getIssueStep({ token, ...args }),
  })

async function createIssueStep(args: Parameters<typeof createIssueCore>[0]) {
  "use step"
  return createIssueCore(args)
}

export const createIssue = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createIssueDescription,
    needsApproval,
    inputSchema: createIssueInputSchema,
    execute: async args => createIssueStep({ token, ...args }),
  })

async function addIssueCommentStep(args: Parameters<typeof addIssueCommentCore>[0]) {
  "use step"
  return addIssueCommentCore(args)
}

export const addIssueComment = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: addIssueCommentDescription,
    needsApproval,
    inputSchema: addIssueCommentInputSchema,
    execute: async args => addIssueCommentStep({ token, ...args }),
  })

async function closeIssueStep(args: Parameters<typeof closeIssueCore>[0]) {
  "use step"
  return closeIssueCore(args)
}

export const closeIssue = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: closeIssueDescription,
    needsApproval,
    inputSchema: closeIssueInputSchema,
    execute: async args => closeIssueStep({ token, ...args }),
  })

async function listLabelsStep(args: Parameters<typeof listLabelsCore>[0]) {
  "use step"
  return listLabelsCore(args)
}

export const listLabels = (token: string): GithubTool =>
  tool({
    description: listLabelsDescription,
    inputSchema: listLabelsInputSchema,
    execute: async args => listLabelsStep({ token, ...args }),
  })

async function addLabelsStep(args: Parameters<typeof addLabelsCore>[0]) {
  "use step"
  return addLabelsCore(args)
}

export const addLabels = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: addLabelsDescription,
    needsApproval,
    inputSchema: addLabelsInputSchema,
    execute: async args => addLabelsStep({ token, ...args }),
  })

async function removeLabelStep(args: Parameters<typeof removeLabelCore>[0]) {
  "use step"
  return removeLabelCore(args)
}

export const removeLabel = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: removeLabelDescription,
    needsApproval,
    inputSchema: removeLabelInputSchema,
    execute: async args => removeLabelStep({ token, ...args }),
  })
