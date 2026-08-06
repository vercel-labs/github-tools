import { tool } from 'ai'
import { resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { GithubTool } from '../types'
import {
  searchCodeInputSchema,
  searchCodeDescription,
  searchCodeCore,
  searchRepositoriesInputSchema,
  searchRepositoriesDescription,
  searchRepositoriesCore,
  searchIssuesInputSchema,
  searchIssuesDescription,
  searchIssuesCore,
} from '../core/search'

async function searchCodeStep(args: Parameters<typeof searchCodeCore>[0]) {
  "use step"
  return searchCodeCore(args)
}

/** Search for code in GitHub repositories. Use qualifiers like "repo:owner/name" to scope the search. Results include matching text snippets when GitHub returns them. */
export const searchCode = (token: GithubTokenInput): GithubTool =>
  tool({
    description: searchCodeDescription,
    inputSchema: searchCodeInputSchema,
    execute: async args => searchCodeStep({ token: await resolveGithubToken(token), ...args }),
  })

async function searchRepositoriesStep(args: Parameters<typeof searchRepositoriesCore>[0]) {
  "use step"
  return searchRepositoriesCore(args)
}

/** Search for GitHub repositories by keyword, topic, language, or other qualifiers. */
export const searchRepositories = (token: GithubTokenInput): GithubTool =>
  tool({
    description: searchRepositoriesDescription,
    inputSchema: searchRepositoriesInputSchema,
    execute: async args => searchRepositoriesStep({ token: await resolveGithubToken(token), ...args }),
  })

async function searchIssuesStep(args: Parameters<typeof searchIssuesCore>[0]) {
  "use step"
  return searchIssuesCore(args)
}

/** Search for issues and pull requests across GitHub using search qualifiers like "repo:owner/name is:open". */
export const searchIssues = (token: GithubTokenInput): GithubTool =>
  tool({
    description: searchIssuesDescription,
    inputSchema: searchIssuesInputSchema,
    execute: async args => searchIssuesStep({ token: await resolveGithubToken(token), ...args }),
  })
