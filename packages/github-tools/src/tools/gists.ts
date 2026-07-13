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
import { resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { ToolOptions, GithubTool } from '../types'

async function listGistsStep(args: Parameters<typeof listGistsCore>[0]) {
  "use step"
  return listGistsCore(args)
}

/** List gists for the authenticated user or a specific user. */
export const listGists = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listGistsDescription,
    inputSchema: listGistsInputSchema,
    execute: async args => listGistsStep({ token: await resolveGithubToken(token), ...args }),
  })

async function getGistStep(args: Parameters<typeof getGistCore>[0]) {
  "use step"
  return getGistCore(args)
}

/** Get a gist by ID, including file contents. */
export const getGist = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getGistDescription,
    inputSchema: getGistInputSchema,
    execute: async args => getGistStep({ token: await resolveGithubToken(token), ...args }),
  })

async function listGistCommentsStep(args: Parameters<typeof listGistCommentsCore>[0]) {
  "use step"
  return listGistCommentsCore(args)
}

/** List comments on a gist. */
export const listGistComments = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listGistCommentsDescription,
    inputSchema: listGistCommentsInputSchema,
    execute: async args => listGistCommentsStep({ token: await resolveGithubToken(token), ...args }),
  })

async function createGistStep(args: Parameters<typeof createGistCore>[0]) {
  "use step"
  return createGistCore(args)
}

/** Create a new gist with one or more files. Requires approval by default. */
export const createGist = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createGistDescription,
    needsApproval,
    inputSchema: createGistInputSchema,
    execute: async args => createGistStep({ token: await resolveGithubToken(token), ...args }),
  })

async function updateGistStep(args: Parameters<typeof updateGistCore>[0]) {
  "use step"
  return updateGistCore(args)
}

/** Update an existing gist. Requires approval by default. */
export const updateGist = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: updateGistDescription,
    needsApproval,
    inputSchema: updateGistInputSchema,
    execute: async args => updateGistStep({ token: await resolveGithubToken(token), ...args }),
  })

async function deleteGistStep(args: Parameters<typeof deleteGistCore>[0]) {
  "use step"
  return deleteGistCore(args)
}

/** Delete a gist permanently. Requires approval by default. */
export const deleteGist = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: deleteGistDescription,
    needsApproval,
    inputSchema: deleteGistInputSchema,
    execute: async args => deleteGistStep({ token: await resolveGithubToken(token), ...args }),
  })

async function createGistCommentStep(args: Parameters<typeof createGistCommentCore>[0]) {
  "use step"
  return createGistCommentCore(args)
}

/** Add a comment to a gist. Requires approval by default. */
export const createGistComment = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createGistCommentDescription,
    needsApproval,
    inputSchema: createGistCommentInputSchema,
    execute: async args => createGistCommentStep({ token: await resolveGithubToken(token), ...args }),
  })
