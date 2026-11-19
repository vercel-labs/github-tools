import type { Entity } from '@emulators/core'
import type { GitHubIssue, GitHubRepo } from '@emulators/github'
import { ApiError } from '../../emulators.js'
import { findRepo, paginate, requireActor, requireRead, type Ctx } from '../access.js'
import { callAsCaller, type SupplementContext } from './context.js'

interface SubIssue extends Entity {
  parent_id: number
  /** The sub-issue's issue ID. An issue has one parent at most. */
  issue_id: number
}

export function registerSubIssues({ app, store, gh }: SupplementContext): void {
  const links = store.collection<SubIssue>('supplement.sub_issues', ['parent_id', 'issue_id'])

  function parentOf(c: Ctx): { repo: GitHubRepo, parent: GitHubIssue } {
    const repo = findRepo(gh, c.req.param('owner'), c.req.param('repo'))
    const parent = gh.issues.findBy('repo_id', repo.id).find(issue => issue.number === Number(c.req.param('issue_number')))
    if (!parent) throw new ApiError(404, 'Not Found')
    return { repo, parent }
  }

  const formatted = (c: Ctx, issue: GitHubIssue) => callAsCaller(app, c, 'GET', `/repos/${gh.repos.get(issue.repo_id)!.full_name}/issues/${issue.number}`)

  app.get('/repos/:owner/:repo/issues/:issue_number/sub_issues', async (c: Ctx) => {
    const { repo, parent } = parentOf(c)
    requireRead(c, gh, repo, 'issues')
    const children = links.findBy('parent_id', parent.id).map(link => gh.issues.get(link.issue_id)).filter(issue => issue !== undefined)
    return c.json(await Promise.all(paginate(c, children).map(issue => formatted(c, issue))))
  })

  app.post('/repos/:owner/:repo/issues/:issue_number/sub_issues', async (c: Ctx) => {
    const { repo, parent } = parentOf(c)
    requireActor(c, gh, repo, { permission: 'issues', access: 'write', role: 'triage' })
    const body = await c.req.json<{ sub_issue_id?: number, replace_parent?: boolean }>()
    const child = body.sub_issue_id === undefined ? undefined : gh.issues.get(body.sub_issue_id)
    const childRepo = child && gh.repos.get(child.repo_id)
    if (!child || !childRepo || child.id === parent.id) throw new ApiError(422, 'Validation Failed')
    // A sub-issue can live in another repository of the same owner.
    if (childRepo.owner_id !== repo.owner_id || childRepo.owner_type !== repo.owner_type) throw new ApiError(422, 'Sub-issue must belong to the same owner as the parent issue')
    const existing = links.findOneBy('issue_id', child.id)
    if (existing && !body.replace_parent) throw new ApiError(422, 'Issue may only have one parent')
    if (existing) links.delete(existing.id)
    links.insert({ parent_id: parent.id, issue_id: child.id })
    return c.json(await formatted(c, parent), 201)
  })
}
