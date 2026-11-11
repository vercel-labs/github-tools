import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGithubTools } from '../index'
import { executeGithubEveTool } from '../eve-runtime'
import { createGithubTools as createTanstackTools } from '../tanstack'
import { createCommitStatusCore } from './checks'
import { guardrailViolation } from './guardrails'
import { addSubIssueCore, createIssueCore, listMilestonesCore, listSubIssuesCore } from './issues'
import { updatePullRequestBranchCore } from './pull-requests'
import { getCollaboratorPermissionCore } from './repository'
import { githubTokenCall } from './token'

type Request = { route: string, query: Record<string, string>, body?: Record<string, unknown> }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function stubGithub(routes: Record<string, unknown>) {
  const requests: Request[] = []
  vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const url = new URL(String(input))
    const route = `${init?.method ?? 'GET'} ${url.pathname}`
    requests.push({ route, query: Object.fromEntries(url.searchParams), body: init?.body ? JSON.parse(String(init.body)) : undefined })
    return route in routes ? json(routes[route]) : json({ message: 'Not Found' }, 404)
  }))
  return requests
}

const user = (login: string) => ({ login, id: 1 })
const issue = (number: number, repo = 'ai') => ({ id: 1000 + number, number, title: `Issue ${number}`, state: 'open', html_url: `https://github.com/vercel/${repo}/issues/${number}`, user: user('octocat'), assignees: [user('octocat')], labels: [] })
const pull = { number: 12, head: { ref: 'feature/x', sha: 'abc', repo: { full_name: 'vercel/ai' } }, base: { ref: 'main' } }
const updated = { message: 'Updating pull request branch.', url: 'https://github.com/vercel/ai/pull/12' }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getCollaboratorPermission', () => {
  it('returns the permission and role of a collaborator', async () => {
    const requests = stubGithub({ 'GET /repos/vercel/ai/collaborators/octocat/permission': { permission: 'write', role_name: 'maintain', user: user('octocat') } })
    await expect(getCollaboratorPermissionCore({ token: 'test', owner: 'vercel', repo: 'ai', username: 'octocat' })).resolves.toMatchObject({ username: 'octocat', permission: 'write', roleName: 'maintain' })
    expect(requests.map(request => request.route)).toEqual(['GET /repos/vercel/ai/collaborators/octocat/permission'])
  })

  it('reports none for a user who is not a collaborator, and not found for a user who does not exist', async () => {
    stubGithub({ 'GET /repos/vercel/ai/collaborators/stranger/permission': { permission: 'none', role_name: '', user: user('stranger') } })
    await expect(getCollaboratorPermissionCore({ token: 'test', owner: 'vercel', repo: 'ai', username: 'stranger' })).resolves.toMatchObject({ username: 'stranger', permission: 'none', roleName: '' })
    await expect(getCollaboratorPermissionCore({ token: 'test', owner: 'vercel', repo: 'ai', username: 'ghost' })).rejects.toMatchObject({ code: 'github_tools.NOT_FOUND' })
  })
})

describe('createCommitStatus', () => {
  it('sets a status on the commit', async () => {
    const requests = stubGithub({ 'POST /repos/vercel/ai/statuses/abc': { id: 7, context: 'bot/review', state: 'success', description: 'No issues found', target_url: 'https://example.com/report', created_at: '2026-01-01T00:00:00Z', creator: user('bot') } })
    const result = await createCommitStatusCore({ token: 'test', owner: 'vercel', repo: 'ai', sha: 'abc', state: 'success', context: 'bot/review', description: 'No issues found', targetUrl: 'https://example.com/report' })
    expect(result).toMatchObject({ id: 7, context: 'bot/review', state: 'success', description: 'No issues found', url: 'https://example.com/report', createdAt: '2026-01-01T00:00:00Z' })
    expect(requests[0]!.body).toEqual({ state: 'success', context: 'bot/review', description: 'No issues found', target_url: 'https://example.com/report' })
  })
})

describe('updatePullRequestBranch', () => {
  it('merges the base branch into the pull request branch', async () => {
    const requests = stubGithub({ 'PUT /repos/vercel/ai/pulls/12/update-branch': updated })
    await expect(updatePullRequestBranchCore({ token: 'test', owner: 'vercel', repo: 'ai', pullNumber: 12, expectedHeadSha: 'abc' })).resolves.toMatchObject(updated)
    expect(requests).toEqual([{ route: 'PUT /repos/vercel/ai/pulls/12/update-branch', query: {}, body: { expected_head_sha: 'abc' } }])
  })

  it('checks the head branch against guardrails.branches before updating it', async () => {
    const requests = stubGithub({ 'GET /repos/vercel/ai/pulls/12': { ...pull, head: { ref: 'agent/fix', sha: 'abc', repo: { full_name: 'vercel/ai' } } }, 'PUT /repos/vercel/ai/pulls/12/update-branch': updated })
    await expect(updatePullRequestBranchCore({ token: 'test', owner: 'vercel', repo: 'ai', pullNumber: 12, guardrails: { branches: ['agent/*'] } })).resolves.toMatchObject(updated)
    expect(requests.map(request => request.route)).toEqual(['GET /repos/vercel/ai/pulls/12', 'PUT /repos/vercel/ai/pulls/12/update-branch'])
  })

  it('refuses a head branch outside guardrails.branches without sending the update', async () => {
    const requests = stubGithub({ 'GET /repos/vercel/ai/pulls/12': pull, 'PUT /repos/vercel/ai/pulls/12/update-branch': updated })
    const guardrails = { branches: ['agent/*'] }
    const input = { owner: 'vercel', repo: 'ai', pullNumber: 12 }
    const reason = 'Writes are limited to branches matching `agent/*`, and pull request #12\'s branch is `feature/x`.'

    const tool = createGithubTools({ token: 'test', guardrails }).updatePullRequestBranch
    await expect((tool.execute as (input: unknown, options: unknown) => Promise<unknown>)(input, { toolCallId: 'call-1', messages: [] })).rejects.toThrow(reason)
    const [tanstackTool] = createTanstackTools({ token: 'test', guardrails, preset: 'pr-author' }).filter(candidate => candidate.name === 'updatePullRequestBranch')
    await expect(tanstackTool!.execute(input)).rejects.toThrow(reason)
    await expect(executeGithubEveTool('updatePullRequestBranch', input, { token: 'test', guardrails })).rejects.toThrow('github_tools.GUARDRAIL_BLOCKED')

    expect(requests.map(request => request.route)).toEqual(Array(3).fill('GET /repos/vercel/ai/pulls/12'))
  })

  it('refuses a fork head outside guardrails.repositories', async () => {
    const fork = { ...pull, head: { ref: 'agent/fix', sha: 'abc', repo: { full_name: 'someone/ai' } } }
    const requests = stubGithub({ 'GET /repos/vercel/ai/pulls/12': fork, 'PUT /repos/vercel/ai/pulls/12/update-branch': updated })
    await expect(updatePullRequestBranchCore({ token: 'test', owner: 'vercel', repo: 'ai', pullNumber: 12, guardrails: { repositories: ['vercel/*'] } }))
      .rejects.toThrow('Pull request #12\'s branch is in `someone/ai`, outside the repositories these tools may act on: `vercel/*`.')
    expect(requests.map(request => request.route)).toEqual(['GET /repos/vercel/ai/pulls/12'])
  })
})

describe('milestones', () => {
  it('lists milestones by state with a summarized description', async () => {
    const description = 'x'.repeat(600)
    const requests = stubGithub({ 'GET /repos/vercel/ai/milestones': [{ number: 3, title: 'v7', state: 'open', description, due_on: '2026-12-01T00:00:00Z', open_issues: 4, closed_issues: 6, html_url: 'https://github.com/vercel/ai/milestone/3' }] })
    const result = await listMilestonesCore({ token: 'test', owner: 'vercel', repo: 'ai', state: 'all', perPage: 1, page: 2 })
    expect(result).toMatchObject({ hasMore: true, page: 2, perPage: 1, nextPage: 3, items: [{ number: 3, title: 'v7', state: 'open', dueOn: '2026-12-01T00:00:00Z', openIssues: 4, closedIssues: 6, url: 'https://github.com/vercel/ai/milestone/3' }] })
    expect(result.items[0]!.description).toContain('[truncated: 100 more characters]')
    expect(requests[0]!.query).toEqual({ state: 'all', per_page: '1', page: '2' })
  })

  it('creates an issue in a milestone', async () => {
    const requests = stubGithub({ 'POST /repos/vercel/ai/issues': issue(9) })
    await createIssueCore({ token: 'test', owner: 'vercel', repo: 'ai', title: 'Issue 9', milestone: 3 })
    expect(requests[0]!.body).toMatchObject({ title: 'Issue 9', milestone: 3 })
  })
})

describe('sub-issues', () => {
  it('lists the sub-issues of an issue', async () => {
    const requests = stubGithub({ 'GET /repos/vercel/ai/issues/1/sub_issues': [issue(2), issue(3, 'docs')] })
    await expect(listSubIssuesCore({ token: 'test', owner: 'vercel', repo: 'ai', issueNumber: 1, perPage: 30, page: 1 })).resolves.toMatchObject({
      hasMore: false,
      items: [
        { number: 2, title: 'Issue 2', state: 'open', url: 'https://github.com/vercel/ai/issues/2', assignees: ['octocat'] },
        { number: 3, title: 'Issue 3', state: 'open', url: 'https://github.com/vercel/docs/issues/3', assignees: ['octocat'] },
      ],
    })
    expect(requests[0]!.query).toEqual({ per_page: '30', page: '1' })
  })

  it('looks up the sub-issue id from its number before adding it', async () => {
    const requests = stubGithub({ 'GET /repos/vercel/docs/issues/5': issue(5, 'docs'), 'POST /repos/vercel/ai/issues/1/sub_issues': issue(1) })
    const result = await addSubIssueCore({ token: 'test', owner: 'vercel', repo: 'ai', issueNumber: 1, subIssueNumber: 5, subIssueRepo: 'docs', replaceParent: true })
    expect(result).toMatchObject({ issueNumber: 1, subIssue: { number: 5, title: 'Issue 5', state: 'open', url: 'https://github.com/vercel/docs/issues/5' } })
    expect(requests).toEqual([
      { route: 'GET /repos/vercel/docs/issues/5', query: {} },
      { route: 'POST /repos/vercel/ai/issues/1/sub_issues', query: {}, body: { sub_issue_id: 1005, replace_parent: true } },
    ])
  })

  it('looks up the sub-issue in the parent repository by default', async () => {
    const requests = stubGithub({ 'GET /repos/vercel/ai/issues/5': issue(5), 'POST /repos/vercel/ai/issues/1/sub_issues': issue(1) })
    await addSubIssueCore({ token: 'test', owner: 'vercel', repo: 'ai', issueNumber: 1, subIssueNumber: 5 })
    expect(requests.map(request => request.route)).toEqual(['GET /repos/vercel/ai/issues/5', 'POST /repos/vercel/ai/issues/1/sub_issues'])
  })

  it('checks the sub-issue repository against guardrails.repositories', () => {
    const guardrails = { repositories: ['vercel/ai'] }
    expect(guardrailViolation(githubTokenCall('addSubIssue', { owner: 'vercel', repo: 'ai', issueNumber: 1, subIssueNumber: 5 }), guardrails)).toBeUndefined()
    expect(guardrailViolation(githubTokenCall('addSubIssue', { owner: 'vercel', repo: 'ai', issueNumber: 1, subIssueNumber: 5, subIssueRepo: 'docs' }), guardrails)).toBe('`vercel/docs` is outside the repositories these tools may act on: `vercel/ai`.')
  })
})
