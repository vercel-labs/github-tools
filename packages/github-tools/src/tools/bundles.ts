import { tool } from 'ai'
import {
  getPullRequestContextInputSchema,
  getPullRequestContextDescription,
  getPullRequestContextCore,
  getIssueContextInputSchema,
  getIssueContextDescription,
  getIssueContextCore,
  getReleaseContextInputSchema,
  getReleaseContextDescription,
  getReleaseContextCore,
  getCiFailureContextInputSchema,
  getCiFailureContextDescription,
  getCiFailureContextCore,
} from '../core/bundles'
import { getPullRequestContextToModelOutput } from '../core/model-output'
import { resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { GithubTool } from '../types'

async function getPullRequestContextStep(args: Parameters<typeof getPullRequestContextCore>[0]) {
  "use step"
  return getPullRequestContextCore(args)
}

/** Fetch pull request details plus files, reviews, and optional CI checks in one call. */
export const getPullRequestContext = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getPullRequestContextDescription,
    inputSchema: getPullRequestContextInputSchema,
    toModelOutput: getPullRequestContextToModelOutput,
    execute: async args => getPullRequestContextStep({ token: await resolveGithubToken(token), ...args }),
  })

async function getIssueContextStep(args: Parameters<typeof getIssueContextCore>[0]) {
  "use step"
  return getIssueContextCore(args)
}

/** Fetch an issue plus available label names and recent comments in one call. */
export const getIssueContext = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getIssueContextDescription,
    inputSchema: getIssueContextInputSchema,
    execute: async args => getIssueContextStep({ token: await resolveGithubToken(token), ...args }),
  })

async function getReleaseContextStep(args: Parameters<typeof getReleaseContextCore>[0]) {
  "use step"
  return getReleaseContextCore(args)
}

/** Fetch a release plus the previous release and tag comparison in one call. */
export const getReleaseContext = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getReleaseContextDescription,
    inputSchema: getReleaseContextInputSchema,
    execute: async args => getReleaseContextStep({ token: await resolveGithubToken(token), ...args }),
  })

async function getCiFailureContextStep(args: Parameters<typeof getCiFailureContextCore>[0]) {
  "use step"
  return getCiFailureContextCore(args)
}

/** Diagnose CI failures for a ref — combined status, failing checks, and failed workflow jobs. */
export const getCiFailureContext = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getCiFailureContextDescription,
    inputSchema: getCiFailureContextInputSchema,
    execute: async args => getCiFailureContextStep({ token: await resolveGithubToken(token), ...args }),
  })
