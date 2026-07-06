import { z } from 'zod'
import { createOctokit } from '../client'

export const searchCodeInputSchema = z.object({
  query: z.string().describe('Search query. Supports GitHub search qualifiers, e.g. "useState repo:facebook/react"'),
  perPage: z.number().optional().default(10).describe('Number of results to return (max 30)'),
})

export const searchCodeDescription = 'Search for code in GitHub repositories. Use qualifiers like "repo:owner/name" to scope the search.'

export async function searchCodeCore({ token, query, perPage }: { token: string, query: string, perPage: number }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.search.code({ q: query, per_page: perPage })
  return {
    totalCount: data.total_count,
    items: data.items.map(item => ({
      name: item.name,
      path: item.path,
      url: item.html_url,
      repository: item.repository.full_name,
      sha: item.sha,
    })),
  }
}

export const searchRepositoriesInputSchema = z.object({
  query: z.string().describe('Search query. Supports GitHub search qualifiers, e.g. "nuxt language:typescript stars:>1000"'),
  perPage: z.number().optional().default(10).describe('Number of results to return (max 30)'),
  sort: z.enum(['stars', 'forks', 'help-wanted-issues', 'updated']).optional().describe('Sort field'),
  order: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort order'),
})

export const searchRepositoriesDescription = 'Search for GitHub repositories by keyword, topic, language, or other qualifiers'

export async function searchRepositoriesCore({ token, query, perPage, sort, order }: { token: string, query: string, perPage: number, sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated', order: 'asc' | 'desc' }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.search.repos({ q: query, per_page: perPage, sort, order })
  return {
    totalCount: data.total_count,
    items: data.items.map(repo => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      topics: repo.topics,
    })),
  }
}
