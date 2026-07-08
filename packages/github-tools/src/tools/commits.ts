import { tool } from 'ai'
import { createGithubTokenStepResolver, type GithubTokenResolver, type GithubTokenStepArgs } from '../core/token'
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

async function listCommitsStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof listCommitsCore>[0]>) {
  "use step"
  return listCommitsCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** List commits for a GitHub repository. Filter by file path to see commits that touched a file. */
export const listCommits = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: listCommitsDescription,
    inputSchema: listCommitsInputSchema,
    execute: async args => listCommitsStep({ token: await resolveToken(), ...args }),
  })

async function getCommitStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof getCommitCore>[0]>) {
  "use step"
  return getCommitCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Get detailed information about a specific commit, including files changed with additions and deletions. */
export const getCommit = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: getCommitDescription,
    inputSchema: getCommitInputSchema,
    toModelOutput: getCommitToModelOutput,
    execute: async args => getCommitStep({ token: await resolveToken(), ...args }),
  })

async function getBlameStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof getBlameCore>[0]>) {
  "use step"
  return getBlameCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Line-level git blame for a file at a commit-like ref (branch, tag, or SHA). */
export const getBlame = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: getBlameDescription,
    inputSchema: getBlameInputSchema,
    execute: async args => getBlameStep({ token: await resolveToken(), ...args }),
  })
