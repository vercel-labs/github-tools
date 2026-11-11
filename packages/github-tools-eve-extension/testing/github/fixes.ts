import type { AppEnv, Hono, Store } from '@emulators/core'
import { ApiError, getGitHubStore } from '../emulators.js'
import { briefUser, findRepo, replaceBody, requireRead, roleRank, type Ctx } from './access.js'
import { callAsCaller } from './supplement/context.js'

interface ReviewComment {
  path?: string
  body?: string
  position?: number
  line?: number
  side?: 'LEFT' | 'RIGHT'
}

/**
 * Requests emulate 0.13.1 has a route for and answers differently from GitHub. Registered before
 * emulate's routes, each fix changes the request on its way in or the store on its way out.
 */
export function registerRequestFixes(app: Hono<AppEnv>, store: Store): void {
  const gh = getGitHubStore(store)

  // GitHub reads a write with no body as an empty object. emulate answers 400, which breaks
  // `forkRepository` and `updatePullRequestBranch` when they send no option.
  app.use('*', async (c: Ctx, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(c.req.method) && await c.req.raw.clone().text() === '') replaceBody(c, {})
    await next()
  })

  // emulate places a review's comments by `position`, which GitHub deprecated, and stores no line.
  // The SDK sends `line` and `side`, so the line stands in for the position and is stored afterward.
  app.use('/repos/:owner/:repo/pulls/:pull_number/reviews', async (c: Ctx, next) => {
    if (c.req.method !== 'POST') return next()
    const body = await c.req.raw.clone().json() as { comments?: ReviewComment[] }
    const byLine = (body.comments ?? []).filter(comment => comment.position === undefined && comment.line !== undefined)
    if (byLine.length === 0) return next()
    replaceBody(c, { ...body, comments: body.comments!.map(comment => byLine.includes(comment) ? { ...comment, position: comment.line } : comment) })
    const before = Math.max(0, ...gh.comments.all().map(comment => comment.id))
    await next()
    const repo = gh.repos.findOneBy('full_name', `${c.req.param('owner')}/${c.req.param('repo')}`)
    const created = gh.comments.all().filter(comment => comment.id > before && comment.repo_id === repo?.id && comment.review_id !== null && comment.pull_number === Number(c.req.param('pull_number')))
    for (const sent of byLine) {
      const comment = created.find(candidate => candidate.line === null && candidate.path === sent.path && candidate.body === sent.body)
      if (comment) gh.comments.update(comment.id, { line: sent.line, side: sent.side ?? 'RIGHT' })
    }
  })

  // GitHub answers 200 for a user with no role, with `none` on a private repository and `read`
  // on a public one, and names roles `read` and `write`. emulate answers 404, and names them
  // `pull` and `push`. This route is registered first, so it replaces emulate's.
  app.get('/repos/:owner/:repo/collaborators/:username/permission', (c: Ctx) => {
    const repo = findRepo(gh, c.req.param('owner'), c.req.param('repo'))
    requireRead(c, gh, repo, 'metadata')
    const user = gh.users.findOneBy('login', c.req.param('username'))
    if (!user) throw new ApiError(404, 'Not Found')
    const role = (['none', 'read', 'triage', 'write', 'maintain', 'admin'] as const)[roleRank(gh, user, repo)]!
    const permission = role === 'maintain' ? 'write' : role === 'triage' ? 'read' : role
    return c.json({ permission, role_name: role, user: briefUser(user) })
  })

  // Publishing a release on GitHub creates its tag. emulate stores the tag's name only, so a
  // compare between two releases, which `getReleaseContext` makes, finds no ref.
  app.use('/repos/:owner/:repo/releases', async (c: Ctx, next) => {
    if (c.req.method !== 'POST') return next()
    const { tag_name: tag, target_commitish: target, draft } = await c.req.raw.clone().json() as { tag_name?: string, target_commitish?: string, draft?: boolean }
    await next()
    const repo = gh.repos.findOneBy('full_name', `${c.req.param('owner')}/${c.req.param('repo')}`)
    if (!repo || !tag || draft || !gh.releases.findBy('repo_id', repo.id).some(release => release.tag_name === tag)) return
    if (gh.refs.findBy('repo_id', repo.id).some(ref => ref.ref === `refs/tags/${tag}`)) return
    const commit = await callAsCaller<{ sha: string }>(app, c, 'GET', `/repos/${repo.full_name}/commits/${encodeURIComponent(target ?? repo.default_branch)}`)
    await callAsCaller(app, c, 'POST', `/repos/${repo.full_name}/git/refs`, { ref: `refs/tags/${tag}`, sha: commit.sha })
  })
}
