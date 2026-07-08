import { tool } from 'ai'
import { createGithubTokenStepResolver, type GithubTokenResolver, type GithubTokenStepArgs } from '../core/token'
import type { GithubTool } from '../types'
import {
  searchCodeInputSchema,
  searchCodeDescription,
  searchCodeCore,
  searchRepositoriesInputSchema,
  searchRepositoriesDescription,
  searchRepositoriesCore,
} from '../core/search'

async function searchCodeStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof searchCodeCore>[0]>) {
  "use step"
  return searchCodeCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Search for code in GitHub repositories. Use qualifiers like "repo:owner/name" to scope the search. */
export const searchCode = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: searchCodeDescription,
    inputSchema: searchCodeInputSchema,
    execute: async args => searchCodeStep({ token: await resolveToken(), ...args }),
  })

async function searchRepositoriesStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof searchRepositoriesCore>[0]>) {
  "use step"
  return searchRepositoriesCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Search for GitHub repositories by keyword, topic, language, or other qualifiers. */
export const searchRepositories = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: searchRepositoriesDescription,
    inputSchema: searchRepositoriesInputSchema,
    execute: async args => searchRepositoriesStep({ token: await resolveToken(), ...args }),
  })
