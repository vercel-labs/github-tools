import { tool } from 'ai'
import { resolveGithubToken, type GithubTokenInput } from '../core/token'
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
} from '../core/commits'
import { getCommitToModelOutput } from '../core/model-output'

async function listCommitsStep(args: Parameters<typeof listCommitsCore>[0]) {
  "use step"
  return listCommitsCore(args)
}

/** List commits for a GitHub repository. Filter by file path to see commits that touched a file. */
export const listCommits = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listCommitsDescription,
    inputSchema: listCommitsInputSchema,
    execute: async args => listCommitsStep({ token: await resolveGithubToken(token), ...args }),
  })

async function getCommitStep(args: Parameters<typeof getCommitCore>[0]) {
  "use step"
  return getCommitCore(args)
}

/** Get detailed information about a specific commit, including files changed with additions and deletions. */
export const getCommit = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getCommitDescription,
    inputSchema: getCommitInputSchema,
    toModelOutput: getCommitToModelOutput,
    execute: async args => getCommitStep({ token: await resolveGithubToken(token), ...args }),
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
    execute: async args => getBlameStep({ token: await resolveGithubToken(token), ...args }),
  })
