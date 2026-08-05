import { tool } from 'ai'
import {
  listCheckRunsInputSchema,
  listCheckRunsDescription,
  listCheckRunsCore,
  getCombinedStatusInputSchema,
  getCombinedStatusDescription,
  getCombinedStatusCore,
} from '../core/checks'
import { resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { GithubTool } from '../types'

async function listCheckRunsStep(args: Parameters<typeof listCheckRunsCore>[0]) {
  "use step"
  return listCheckRunsCore(args)
}

/** List check runs (Checks API — GitHub Actions and other CI providers) for a commit, branch, or tag. */
export const listCheckRuns = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listCheckRunsDescription,
    inputSchema: listCheckRunsInputSchema,
    execute: async args => listCheckRunsStep({ token: await resolveGithubToken(token), ...args }),
  })

async function getCombinedStatusStep(args: Parameters<typeof getCombinedStatusCore>[0]) {
  "use step"
  return getCombinedStatusCore(args)
}

/** Get the combined commit status (Statuses API — legacy CI integrations) for a commit, branch, or tag. */
export const getCombinedStatus = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getCombinedStatusDescription,
    inputSchema: getCombinedStatusInputSchema,
    execute: async args => getCombinedStatusStep({ token: await resolveGithubToken(token), ...args }),
  })
