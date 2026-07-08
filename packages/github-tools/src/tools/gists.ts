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
import { createGithubTokenStepResolver, type GithubTokenResolver, type GithubTokenStepArgs } from '../core/token'
import type { GithubTool, ToolOptions } from '../types'

async function listGistsStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof listGistsCore>[0]>) {
  "use step"
  return listGistsCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** List gists for the authenticated user or a specific user. */
export const listGists = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: listGistsDescription,
    inputSchema: listGistsInputSchema,
    execute: async args => listGistsStep({ token: await resolveToken(), ...args }),
  })

async function getGistStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof getGistCore>[0]>) {
  "use step"
  return getGistCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Get a gist by ID, including file contents. */
export const getGist = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: getGistDescription,
    inputSchema: getGistInputSchema,
    execute: async args => getGistStep({ token: await resolveToken(), ...args }),
  })

async function listGistCommentsStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof listGistCommentsCore>[0]>) {
  "use step"
  return listGistCommentsCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** List comments on a gist. */
export const listGistComments = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: listGistCommentsDescription,
    inputSchema: listGistCommentsInputSchema,
    execute: async args => listGistCommentsStep({ token: await resolveToken(), ...args }),
  })

async function createGistStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof createGistCore>[0]>) {
  "use step"
  return createGistCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Create a new gist with one or more files. Requires approval by default. */
export const createGist = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createGistDescription,
    needsApproval,
    inputSchema: createGistInputSchema,
    execute: async args => createGistStep({ token: await resolveToken(), ...args }),
  })

async function updateGistStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof updateGistCore>[0]>) {
  "use step"
  return updateGistCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Update an existing gist. Requires approval by default. */
export const updateGist = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: updateGistDescription,
    needsApproval,
    inputSchema: updateGistInputSchema,
    execute: async args => updateGistStep({ token: await resolveToken(), ...args }),
  })

async function deleteGistStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof deleteGistCore>[0]>) {
  "use step"
  return deleteGistCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Delete a gist permanently. Requires approval by default. */
export const deleteGist = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: deleteGistDescription,
    needsApproval,
    inputSchema: deleteGistInputSchema,
    execute: async args => deleteGistStep({ token: await resolveToken(), ...args }),
  })

async function createGistCommentStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof createGistCommentCore>[0]>) {
  "use step"
  return createGistCommentCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Add a comment to a gist. Requires approval by default. */
export const createGistComment = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createGistCommentDescription,
    needsApproval,
    inputSchema: createGistCommentInputSchema,
    execute: async args => createGistCommentStep({ token: await resolveToken(), ...args }),
  })
