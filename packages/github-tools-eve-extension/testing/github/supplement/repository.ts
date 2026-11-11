import { ApiError } from '../../emulators.js'
import { findRepo, requireRead, type Ctx } from '../access.js'
import { callAsCaller, type SupplementContext } from './context.js'

export function registerRepositoryRoutes({ app, gh }: SupplementContext): void {
  // Rules come from rulesets, which the emulator doesn't model, so a branch has none. Classic
  // branch protection is emulate's, and `getBranchRules` reads it from the branch.
  app.get('/repos/:owner/:repo/rules/branches/:branch{.+}', (c: Ctx) => {
    const repo = findRepo(gh, c.req.param('owner'), c.req.param('repo'))
    requireRead(c, gh, repo, 'metadata')
    if (!gh.branches.findBy('repo_id', repo.id).some(branch => branch.name === c.req.param('branch'))) throw new ApiError(404, 'Not Found')
    return c.json([])
  })

  // The repositories an installation token reaches, which the SDK's caller-access check lists before a search.
  app.get('/installation/repositories', (c: Ctx) => {
    const installation = c.get('authUser')?.installation
    if (!installation) throw new ApiError(403, 'You must authenticate with an installation access token in order to list repositories for an installation.')
    const reached = gh.repos.all().filter(repo => repo.owner_id === installation.accountId && repo.owner_type === installation.accountType
      && (installation.repositorySelection === 'all' || installation.repositoryIds.includes(repo.id)))
    return c.json({
      total_count: reached.length,
      repository_selection: installation.repositorySelection,
      repositories: reached.map(repo => ({ id: repo.id, node_id: repo.node_id, name: repo.name, full_name: repo.full_name, private: repo.private })),
    })
  })

  // emulate models a rerun as a new run with stub jobs, so rerunning the failed jobs is the same rerun.
  app.post('/repos/:owner/:repo/actions/runs/:run_id/rerun-failed-jobs', async (c: Ctx) => {
    const repo = findRepo(gh, c.req.param('owner'), c.req.param('repo'))
    await callAsCaller(app, c, 'POST', `/repos/${repo.full_name}/actions/runs/${c.req.param('run_id')}/rerun`)
    return c.json({}, 201)
  })

  // A reply joins its parent's thread: same file, line, and commit. emulate's own route creates it.
  app.post('/repos/:owner/:repo/pulls/:pull_number/comments/:comment_id/replies', async (c: Ctx) => {
    const repo = findRepo(gh, c.req.param('owner'), c.req.param('repo'))
    const pullNumber = Number(c.req.param('pull_number'))
    const parent = gh.comments.get(Number(c.req.param('comment_id')))
    if (!parent || parent.repo_id !== repo.id || parent.comment_type !== 'review' || parent.pull_number !== pullNumber) throw new ApiError(404, 'Not Found')
    const { body } = await c.req.json<{ body?: string }>()
    const reply = await callAsCaller(app, c, 'POST', `/repos/${repo.full_name}/pulls/${pullNumber}/comments`, {
      body,
      in_reply_to_id: parent.in_reply_to_id ?? parent.id,
      commit_id: parent.commit_sha,
      path: parent.path,
      line: parent.line,
      side: parent.side,
      subject_type: parent.subject_type,
    })
    return c.json(reply, 201)
  })
}
