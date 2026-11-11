import type { Entity } from '@emulators/core'
import { ApiError } from '../../emulators.js'
import { briefUser, findRepo, requireActor, type Ctx } from '../access.js'
import { callAsCaller, type SupplementContext } from './context.js'

interface CommitStatus extends Entity {
  repo_id: number
  sha: string
  state: string
  context: string
  description: string | null
  target_url: string | null
  creator_id: number
}

const STATES = ['error', 'failure', 'pending', 'success']

export function registerStatuses({ app, store, gh, baseUrl }: SupplementContext): void {
  const statuses = store.collection<CommitStatus>('supplement.statuses', ['repo_id'])

  const format = (status: CommitStatus, fullName: string) => ({
    id: status.id,
    node_id: `SC_${status.id}`,
    url: `${baseUrl}/repos/${fullName}/statuses/${status.sha}`,
    state: status.state,
    context: status.context,
    description: status.description,
    target_url: status.target_url,
    creator: briefUser(gh.users.get(status.creator_id)),
    created_at: status.created_at,
    updated_at: status.updated_at,
  })

  app.post('/repos/:owner/:repo/statuses/:sha', async (c: Ctx) => {
    const repo = findRepo(gh, c.req.param('owner'), c.req.param('repo'))
    const actor = requireActor(c, gh, repo, { permission: 'statuses', access: 'write', role: 'write' })
    const sha = c.req.param('sha')
    if (!gh.commits.findBy('repo_id', repo.id).some(commit => commit.sha === sha)) throw new ApiError(422, `No commit found for SHA: ${sha}`)
    const body = await c.req.json<{ state?: string, context?: string, description?: string, target_url?: string }>()
    if (!body.state || !STATES.includes(body.state)) throw new ApiError(422, 'Validation Failed')
    const status = statuses.insert({
      repo_id: repo.id,
      sha,
      state: body.state,
      context: body.context ?? 'default',
      description: body.description ?? null,
      target_url: body.target_url ?? null,
      creator_id: actor.id,
    })
    return c.json(format(status, repo.full_name), 201)
  })

  // Registered before emulate's routes: its `/commits/:ref{.+}` would take this path as a ref.
  app.get('/repos/:owner/:repo/commits/:ref{.+}/status', async (c: Ctx) => {
    const repo = findRepo(gh, c.req.param('owner'), c.req.param('repo'))
    // emulate resolves the ref and checks the caller can read the repository's contents.
    const commit = await callAsCaller<{ sha: string }>(app, c, 'GET', `/repos/${repo.full_name}/commits/${c.req.param('ref')}`)
    const latest = new Map<string, CommitStatus>()
    for (const status of statuses.findBy('repo_id', repo.id)) {
      if (status.sha === commit.sha) latest.set(status.context, status)
    }
    const states = [...latest.values()].map(status => status.state)
    const state = states.some(value => value === 'failure' || value === 'error')
      ? 'failure'
      : states.length > 0 && states.every(value => value === 'success') ? 'success' : 'pending'
    return c.json({
      state,
      sha: commit.sha,
      total_count: latest.size,
      statuses: [...latest.values()].map(status => format(status, repo.full_name)),
      commit_url: `${baseUrl}/repos/${repo.full_name}/commits/${commit.sha}`,
      url: `${baseUrl}/repos/${repo.full_name}/commits/${commit.sha}/status`,
    })
  })
}
