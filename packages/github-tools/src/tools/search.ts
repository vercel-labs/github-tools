import { tool } from 'ai'
import type { GithubTool } from '../types'
import {
  searchCodeInputSchema,
  searchCodeDescription,
  searchCodeCore,
  searchRepositoriesInputSchema,
  searchRepositoriesDescription,
  searchRepositoriesCore,
} from '../core/search'

async function searchCodeStep(args: Parameters<typeof searchCodeCore>[0]) {
  "use step"
  return searchCodeCore(args)
}

/** Search for code in GitHub repositories. Use qualifiers like "repo:owner/name" to scope the search. */
export const searchCode = (token: string): GithubTool =>
  tool({
    description: searchCodeDescription,
    inputSchema: searchCodeInputSchema,
    execute: async args => searchCodeStep({ token, ...args }),
  })

async function searchRepositoriesStep(args: Parameters<typeof searchRepositoriesCore>[0]) {
  "use step"
  return searchRepositoriesCore(args)
}

/** Search for GitHub repositories by keyword, topic, language, or other qualifiers. */
export const searchRepositories = (token: string): GithubTool =>
  tool({
    description: searchRepositoriesDescription,
    inputSchema: searchRepositoriesInputSchema,
    execute: async args => searchRepositoriesStep({ token, ...args }),
  })
