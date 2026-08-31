import { z } from 'zod'
import { withOctokit } from '../client'
import { fetchAllPages, hasMoreByTotal, maxPagesSchema, pageSchema, pagingFields } from './pagination'

export const listCheckRunsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  ref: z.string().describe('Git ref: branch, tag, or commit SHA'),
  perPage: z.number().optional().default(30).describe('Number of results to return per page (max 100)'),
  page: pageSchema,
  maxPages: maxPagesSchema,
})

export const listCheckRunsDescription = 'List check runs (Checks API — GitHub Actions and other CI providers) for a commit, branch, or tag. When hasMore, pass nextPage or raise maxPages — do not repeat the same call.'

export async function listCheckRunsCore({ token, owner, repo, ref, perPage, page = 1, maxPages }: { token: string, owner: string, repo: string, ref: string, perPage: number, page?: number, maxPages?: number }) {
  return withOctokit(token, async (octokit) => {
  let totalCount = 0
  const { items } = await fetchAllPages(async currentPage => {
    const { data } = await octokit.rest.checks.listForRef({ owner, repo, ref, per_page: perPage, page: currentPage })
    totalCount = data.total_count
    return data.check_runs
  }, perPage, maxPages, page)
  return {
    totalCount,
    checkRuns: items.map(run => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      url: run.html_url,
      startedAt: run.started_at,
      completedAt: run.completed_at,
    })),
    ...pagingFields(page, perPage, items.length, hasMoreByTotal(page, perPage, items.length, totalCount)),
  }
  })
}

export const getCombinedStatusInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  ref: z.string().describe('Git ref: branch, tag, or commit SHA'),
})

export const getCombinedStatusDescription = 'Get the combined commit status (Statuses API — legacy CI integrations) for a commit, branch, or tag'

export async function getCombinedStatusCore({ token, owner, repo, ref }: { token: string, owner: string, repo: string, ref: string }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.repos.getCombinedStatusForRef({ owner, repo, ref })
  return {
    state: data.state,
    totalCount: data.total_count,
    statuses: data.statuses.map(status => ({
      context: status.context,
      state: status.state,
      description: status.description,
      url: status.target_url,
    })),
  }
  })
}
