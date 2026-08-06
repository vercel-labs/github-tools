import { tool } from 'ai'
import {
  listReleasesInputSchema,
  listReleasesDescription,
  listReleasesCore,
  getLatestReleaseInputSchema,
  getLatestReleaseDescription,
  getLatestReleaseCore,
  getReleaseInputSchema,
  getReleaseDescription,
  getReleaseCore,
  createReleaseInputSchema,
  createReleaseDescription,
  createReleaseCore,
  updateReleaseInputSchema,
  updateReleaseDescription,
  updateReleaseCore,
  deleteReleaseInputSchema,
  deleteReleaseDescription,
  deleteReleaseCore,
} from '../core/releases'
import { resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { ToolOptions, GithubTool } from '../types'

async function listReleasesStep(args: Parameters<typeof listReleasesCore>[0]) {
  "use step"
  return listReleasesCore(args)
}

/** List releases for a GitHub repository, newest first (includes drafts and prereleases). */
export const listReleases = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listReleasesDescription,
    inputSchema: listReleasesInputSchema,
    execute: async args => listReleasesStep({ token: await resolveGithubToken(token), ...args }),
  })

async function getLatestReleaseStep(args: Parameters<typeof getLatestReleaseCore>[0]) {
  "use step"
  return getLatestReleaseCore(args)
}

/** Get the latest published release for a GitHub repository (excludes drafts and prereleases). */
export const getLatestRelease = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getLatestReleaseDescription,
    inputSchema: getLatestReleaseInputSchema,
    execute: async args => getLatestReleaseStep({ token: await resolveGithubToken(token), ...args }),
  })

async function getReleaseStep(args: Parameters<typeof getReleaseCore>[0]) {
  "use step"
  return getReleaseCore(args)
}

/** Get a specific release by ID, including its assets. */
export const getRelease = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getReleaseDescription,
    inputSchema: getReleaseInputSchema,
    execute: async args => getReleaseStep({ token: await resolveGithubToken(token), ...args }),
  })

async function createReleaseStep(args: Parameters<typeof createReleaseCore>[0]) {
  "use step"
  return createReleaseCore(args)
}

/** Create a new release (and its tag if needed) in a GitHub repository. Requires approval by default. */
export const createRelease = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createReleaseDescription,
    needsApproval,
    inputSchema: createReleaseInputSchema,
    execute: async args => createReleaseStep({ token: await resolveGithubToken(token), ...args }),
  })

async function updateReleaseStep(args: Parameters<typeof updateReleaseCore>[0]) {
  "use step"
  return updateReleaseCore(args)
}

/** Update an existing release — tag, target, title, notes, draft, or prerelease status. Requires approval by default. */
export const updateRelease = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: updateReleaseDescription,
    needsApproval,
    inputSchema: updateReleaseInputSchema,
    execute: async args => updateReleaseStep({ token: await resolveGithubToken(token), ...args }),
  })

async function deleteReleaseStep(args: Parameters<typeof deleteReleaseCore>[0]) {
  "use step"
  return deleteReleaseCore(args)
}

/** Delete a release permanently. Requires approval by default. */
export const deleteRelease = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: deleteReleaseDescription,
    needsApproval,
    inputSchema: deleteReleaseInputSchema,
    execute: async args => deleteReleaseStep({ token: await resolveGithubToken(token), ...args }),
  })
