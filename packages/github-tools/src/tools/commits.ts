import { tool } from 'ai'
import { githubTokenCall, resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { GithubTool } from '../types'
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
  compareCommitsInputSchema,
  compareCommitsDescription,
  compareCommitsCore,
} from '../core/commits'
import { getCommitToModelOutput, compareCommitsToModelOutput } from '../core/model-output'

async function listCommitsStep(args: Parameters<typeof listCommitsCore>[0]) {
  "use step"
  return listCommitsCore(args)
}

/** List commits for a GitHub repository. Filter by file path to see commits that touched a file. */
export const listCommits = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listCommitsDescription,
    inputSchema: listCommitsInputSchema,
    execute: async args => listCommitsStep({ token: await resolveGithubToken(token, githubTokenCall('listCommits', args)), ...args }),
  })

async function getCommitStep(args: Parameters<typeof getCommitCore>[0]) {
  "use step"
  return getCommitCore(args)
}

/** Get detailed information about a specific commit. Patches omitted by default. */
export const getCommit = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getCommitDescription,
    inputSchema: getCommitInputSchema,
    toModelOutput: getCommitToModelOutput,
    execute: async args => getCommitStep({ token: await resolveGithubToken(token, githubTokenCall('getCommit', args)), ...args }),
  })

async function getBlameStep(args: Parameters<typeof getBlameCore>[0]) {
  "use step"
  return getBlameCore(args)
}

/** Line-level git blame for a file at a commit-like ref (branch, tag, or SHA). */
export const getBlame = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getBlameDescription,
    inputSchema: getBlameInputSchema,
    execute: async args => getBlameStep({ token: await resolveGithubToken(token, githubTokenCall('getBlame', args)), ...args }),
  })

async function compareCommitsStep(args: Parameters<typeof compareCommitsCore>[0]) {
  "use step"
  return compareCommitsCore(args)
}

/** Compare two branches, tags, or commits. Patches omitted by default. */
export const compareCommits = (token: GithubTokenInput): GithubTool =>
  tool({
    description: compareCommitsDescription,
    inputSchema: compareCommitsInputSchema,
    toModelOutput: compareCommitsToModelOutput,
    execute: async args => compareCommitsStep({ token: await resolveGithubToken(token, githubTokenCall('compareCommits', args)), ...args }),
  })
