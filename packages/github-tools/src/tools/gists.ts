import { tool } from 'ai'
import {
  listGistsInputSchema,
  listGistsDescription,
  listGistsCore,
  getGistInputSchema,
  getGistDescription,
  getGistCore,
  listGistCommentsInputSchema,
  listGistCommentsDescription,
  listGistCommentsCore,
  createGistInputSchema,
  createGistDescription,
  createGistCore,
  updateGistInputSchema,
  updateGistDescription,
  updateGistCore,
  deleteGistInputSchema,
  deleteGistDescription,
  deleteGistCore,
  createGistCommentInputSchema,
  createGistCommentDescription,
  createGistCommentCore,
} from '../core/gists'
import type { ToolOptions, GithubTool } from '../types'

async function listGistsStep(args: Parameters<typeof listGistsCore>[0]) {
  "use step"
  return listGistsCore(args)
}

export const listGists = (token: string): GithubTool =>
  tool({
    description: listGistsDescription,
    inputSchema: listGistsInputSchema,
    execute: async args => listGistsStep({ token, ...args }),
  })

async function getGistStep(args: Parameters<typeof getGistCore>[0]) {
  "use step"
  return getGistCore(args)
}

export const getGist = (token: string): GithubTool =>
  tool({
    description: getGistDescription,
    inputSchema: getGistInputSchema,
    execute: async args => getGistStep({ token, ...args }),
  })

async function listGistCommentsStep(args: Parameters<typeof listGistCommentsCore>[0]) {
  "use step"
  return listGistCommentsCore(args)
}

export const listGistComments = (token: string): GithubTool =>
  tool({
    description: listGistCommentsDescription,
    inputSchema: listGistCommentsInputSchema,
    execute: async args => listGistCommentsStep({ token, ...args }),
  })

async function createGistStep(args: Parameters<typeof createGistCore>[0]) {
  "use step"
  return createGistCore(args)
}

export const createGist = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createGistDescription,
    needsApproval,
    inputSchema: createGistInputSchema,
    execute: async args => createGistStep({ token, ...args }),
  })

async function updateGistStep(args: Parameters<typeof updateGistCore>[0]) {
  "use step"
  return updateGistCore(args)
}

export const updateGist = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: updateGistDescription,
    needsApproval,
    inputSchema: updateGistInputSchema,
    execute: async args => updateGistStep({ token, ...args }),
  })

async function deleteGistStep(args: Parameters<typeof deleteGistCore>[0]) {
  "use step"
  return deleteGistCore(args)
}

export const deleteGist = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: deleteGistDescription,
    needsApproval,
    inputSchema: deleteGistInputSchema,
    execute: async args => deleteGistStep({ token, ...args }),
  })

async function createGistCommentStep(args: Parameters<typeof createGistCommentCore>[0]) {
  "use step"
  return createGistCommentCore(args)
}

export const createGistComment = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createGistCommentDescription,
    needsApproval,
    inputSchema: createGistCommentInputSchema,
    execute: async args => createGistCommentStep({ token, ...args }),
  })
