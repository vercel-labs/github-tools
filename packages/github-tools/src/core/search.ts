import { z } from 'zod'
import { createOctokit } from '../client'

const MAX_FRAGMENT_LENGTH = 300

function truncateFragment(fragment: string): string {
  if (fragment.length <= MAX_FRAGMENT_LENGTH) return fragment
  return `${fragment.slice(0, MAX_FRAGMENT_LENGTH)}…`
}

export const searchCodeInputSchema = z.object({
  query: z.string().describe('Search query. Supports GitHub search qualifiers, e.g. "useState repo:facebook/react"'),
  perPage: z.number().optional().default(10).describe('Number of results to return (max 30)'),
})

export const searchCodeDescription = 'Search for code in GitHub repositories. Use qualifiers like "repo:owner/name" to scope the search. Results include matching text snippets when GitHub returns them.'

export async function searchCodeCore({ token, query, perPage }: { token: string, query: string, perPage: number }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.search.code({
    q: query,
    per_page: perPage,
    mediaType: { format: 'text-match' },
  })
  return {
    totalCount: data.total_count,
    items: data.items.map(item => ({
      name: item.name,
      path: item.path,
      url: item.html_url,
      repository: item.repository.full_name,
      sha: item.sha,
      textMatches: item.text_matches?.map(match => ({
        fragment: truncateFragment(match.fragment ?? ''),
      })),
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

export const searchIssuesInputSchema = z.object({
  query: z.string().describe('Search query. Supports GitHub search qualifiers, e.g. "repo:owner/name is:open label:bug". Returns both issues and pull requests by default — use type:pr or is:pr to scope to pull requests, or type:issue / is:issue to exclude them'),
  perPage: z.number().optional().default(10).describe('Number of results to return (max 30)'),
  sort: z.enum(['comments', 'reactions', 'created', 'updated', 'interactions']).optional().describe('Sort field'),
  order: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort order'),
})

export const searchIssuesDescription = 'Search for issues and pull requests across GitHub using search qualifiers like "repo:owner/name is:open"'

export async function searchIssuesCore({ token, query, perPage, sort, order }: { token: string, query: string, perPage: number, sort?: 'comments' | 'reactions' | 'created' | 'updated' | 'interactions', order: 'asc' | 'desc' }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.search.issuesAndPullRequests({ q: query, per_page: perPage, sort, order })
  return {
    totalCount: data.total_count,
    items: data.items.map(item => ({
      number: item.number,
      title: item.title,
      state: item.state,
      url: item.html_url,
      repository: item.repository_url.split('/repos/').at(-1),
      author: item.user?.login,
      labels: item.labels.map(l => (typeof l === 'string' ? l : l.name)),
      comments: item.comments,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      isPullRequest: Boolean(item.pull_request),
    })),
  }
}
