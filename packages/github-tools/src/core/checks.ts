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

export const createCommitStatusInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  sha: z.string().describe('SHA of the commit to report on, such as a pull request\'s head SHA'),
  state: z.enum(['error', 'failure', 'pending', 'success']).describe('Result to report. Use pending while the work runs'),
  context: z.string().describe('Name that identifies this status, such as "bot/review". A later status with the same context replaces it'),
  description: z.string().optional().describe('Short summary shown next to the status'),
  targetUrl: z.string().optional().describe('Link to the full result, such as a report or a log'),
})

export const createCommitStatusDescription = 'Report a result on a commit as a commit status (Statuses API), shown on its pull requests and usable as a required check. Works with personal access tokens and GitHub Apps, unlike check runs, which only GitHub Apps can create'

/** Not idempotent: each call adds a status, and GitHub shows the latest one for each context. */
export async function createCommitStatusCore({ token, owner, repo, sha, state, context, description, targetUrl }: {
  token: string
  owner: string
  repo: string
  sha: string
  state: 'error' | 'failure' | 'pending' | 'success'
  context: string
  description?: string
  targetUrl?: string
}) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.repos.createCommitStatus({ owner, repo, sha, state, context, description, target_url: targetUrl })
  return {
    id: data.id,
    context: data.context,
    state: data.state,
    description: data.description,
    url: data.target_url,
    createdAt: data.created_at,
  }
  })
}
