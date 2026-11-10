import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeGithubEveTool } from '../eve-runtime'
import { githubRoleRank, withGithubCallerAccess, type GithubCaller } from './caller-access'
import { githubTokenCall, type GithubTokenCall } from './token'
import type { GithubToolName } from './tool-names'

const call = (name: GithubToolName, input: Record<string, unknown>) => githubTokenCall(name, input)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

// Each test uses its own logins: roles are cached per login and repository.
function stubGithub(routes: Record<string, unknown>) {
  const requests: string[] = []
  vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const url = new URL(String(input))
    const route = `${init?.method ?? 'GET'} ${url.pathname}`
    requests.push(route)
    return route in routes ? json(routes[route]) : json({ message: 'Not Found' }, 404)
  }))
  return requests
}

// The token a call is checked and run with, and the calls it was requested for.
function access(caller: GithubCaller) {
  const requested: string[] = []
  const token = withGithubCallerAccess(async (tokenCall?: GithubTokenCall) => {
    requested.push(`${tokenCall?.toolName} ${tokenCall?.owner}/${tokenCall?.repo}`)
    return 'test'
  }, caller)
  return { token, requested }
}

const role = (permission: string, role_name: string) => ({ permission, role_name, user: { login: 'x', id: 1 } })
const permissionRoute = (repo: string, login: string) => `GET /repos/${repo}/collaborators/${login}/permission`
const reaches = (...repositories: string[]) => ({ total_count: repositories.length, repositories: repositories.map(full_name => ({ full_name })) })
const thread = (owner: string, name: string) => ({ data: { node: { repository: { name, owner: { login: owner } } } } })
const refused = (reason: string) => ({ code: 'github_tools.CALLER_FORBIDDEN', message: `Not allowed for the person who asked: ${reason}` })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('githubRoleRank', () => {
  it('ranks GitHub\'s roles from read to admin', () => {
    expect(['read', 'triage', 'write', 'maintain', 'admin'].map(roleName => githubRoleRank({ permission: 'read', roleName }))).toEqual([0, 1, 2, 3, 4])
  })

  it('ranks a custom role as its base permission, and no access below read', () => {
    expect(githubRoleRank({ permission: 'write', roleName: 'release-captain' })).toBe(2)
    expect(githubRoleRank({ permission: 'none', roleName: '' })).toBe(-1)
  })
})

describe('withGithubCallerAccess on a repository', () => {
  it('lets a reader read and refuses their write before its token is requested', async () => {
    stubGithub({ [permissionRoute('vercel/ai', 'reader')]: role('read', 'read') })
    const { token, requested } = access({ login: 'reader' })
    await expect(token(call('getRepository', { owner: 'vercel', repo: 'ai' }))).resolves.toBe('test')
    await expect(token(call('createIssue', { owner: 'vercel', repo: 'ai', title: 'x' })))
      .rejects.toMatchObject(refused('reader has read access to vercel/ai, and `createIssue` needs write access.'))
    expect(requested).toEqual(['getCollaboratorPermission vercel/ai', 'getRepository vercel/ai'])
  })

  it('refuses a triager\'s write, and lets a maintainer merge', async () => {
    stubGithub({
      [permissionRoute('vercel/ai', 'triager')]: role('read', 'triage'),
      [permissionRoute('vercel/ai', 'maintainer')]: role('write', 'maintain'),
    })
    await expect(access({ login: 'triager' }).token(call('addLabels', { owner: 'vercel', repo: 'ai', issueNumber: 1, labels: ['bug'] })))
      .rejects.toMatchObject(refused('triager has triage access to vercel/ai, and `addLabels` needs write access.'))
    await expect(access({ login: 'maintainer' }).token(call('mergePullRequest', { owner: 'vercel', repo: 'ai', pullNumber: 1 }))).resolves.toBe('test')
  })

  it('refuses a read of a repository the caller has no access to', async () => {
    stubGithub({ [permissionRoute('vercel/private', 'outsider')]: role('none', '') })
    await expect(access({ login: 'outsider' }).token(call('getFileContent', { owner: 'vercel', repo: 'private', path: 'README.md' })))
      .rejects.toMatchObject(refused('outsider has no access to vercel/private, and `getFileContent` needs read access.'))
  })

  it('checks the sub-issue\'s repository of addSubIssue', async () => {
    stubGithub({
      [permissionRoute('vercel/ai', 'planner')]: role('write', 'write'),
      [permissionRoute('vercel/private', 'planner')]: role('none', ''),
    })
    await expect(access({ login: 'planner' }).token(call('addSubIssue', { owner: 'vercel', repo: 'ai', issueNumber: 1, subIssueNumber: 2, subIssueRepo: 'private' })))
      .rejects.toMatchObject(refused('planner has no access to vercel/private, and `addSubIssue` needs read access.'))
  })

  it('asks GitHub once for several calls by the same person on the same repository', async () => {
    const requests = stubGithub({ [permissionRoute('vercel/ai', 'repeat')]: role('write', 'write') })
    await access({ login: 'repeat' }).token(call('getRepository', { owner: 'vercel', repo: 'ai' }))
    await access({ login: 'Repeat' }).token(call('createIssue', { owner: 'Vercel', repo: 'AI', title: 'x' }))
    expect(requests).toEqual([permissionRoute('vercel/ai', 'repeat')])
  })

  it('fails when GitHub can\'t answer, and asks again next time', async () => {
    const requests = stubGithub({})
    const check = () => access({ login: 'ghost' }).token(call('getRepository', { owner: 'vercel', repo: 'ai' }))
    await expect(check()).rejects.toMatchObject({ code: 'github_tools.NOT_FOUND' })
    await expect(check()).rejects.toMatchObject({ code: 'github_tools.NOT_FOUND' })
    expect(requests).toHaveLength(2)
  })

  it('returns the refusal as an error result from an eve tool, without calling the tool\'s endpoint', async () => {
    const requests = stubGithub({ [permissionRoute('vercel/ai', 'guest')]: role('read', 'read') })
    const result = await executeGithubEveTool('createIssue', { owner: 'vercel', repo: 'ai', title: 'x' }, { token: withGithubCallerAccess('test', { login: 'guest' }) })
    expect(result).toMatchObject({ error: { code: 'github_tools.CALLER_FORBIDDEN' } })
    expect(requests).toEqual([permissionRoute('vercel/ai', 'guest')])
  })
})

describe('withGithubCallerAccess without a repository', () => {
  const repository = { owner: 'vercel', repo: 'ai' }

  it('runs a search with a token that reaches the caller\'s repository only', async () => {
    stubGithub({
      [permissionRoute('vercel/ai', 'searcher')]: role('read', 'read'),
      'GET /installation/repositories': reaches('vercel/ai'),
    })
    const { token, requested } = access({ login: 'searcher', repository })
    await expect(token(call('searchCode', { query: 'token' }))).resolves.toBe('test')
    expect(requested).toEqual(['getCollaboratorPermission vercel/ai', 'searchCode vercel/ai'])
  })

  it('refuses a search when the token reaches other repositories', async () => {
    stubGithub({
      [permissionRoute('vercel/ai', 'wide')]: role('write', 'write'),
      'GET /installation/repositories': reaches('vercel/ai', 'vercel/private'),
    })
    await expect(access({ login: 'wide', repository }).token(call('searchIssues', { query: 'secret' })))
      .rejects.toMatchObject(refused('`searchIssues` would search every repository the agent\'s token reaches, not only vercel/ai, and wide\'s role can\'t be checked on all of them.'))
  })

  it('refuses a search with a token that can\'t list what it reaches, such as a personal access token', async () => {
    stubGithub({ [permissionRoute('vercel/ai', 'pat')]: role('write', 'write') })
    await expect(access({ login: 'pat', repository }).token(call('searchRepositories', { query: 'org:vercel' })))
      .rejects.toMatchObject({ code: 'github_tools.CALLER_FORBIDDEN' })
  })

  it('refuses a search when the caller\'s repository is unknown or they can\'t read it', async () => {
    stubGithub({ [permissionRoute('vercel/ai', 'blind')]: role('none', '') })
    await expect(access({ login: 'nowhere' }).token(call('searchCode', { query: 'token' })))
      .rejects.toMatchObject(refused('`searchCode` names no repository, so nowhere\'s role can\'t be checked for it.'))
    await expect(access({ login: 'blind', repository }).token(call('searchCode', { query: 'token' })))
      .rejects.toMatchObject(refused('blind has no access to vercel/ai, and `searchCode` needs read access.'))
  })

  it('resolves a review thread only with Write on the repository the thread is in', async () => {
    const requests = stubGithub({
      'POST /graphql': thread('vercel', 'private'),
      [permissionRoute('vercel/private', 'resolver')]: role('write', 'write'),
      [permissionRoute('vercel/private', 'onlooker')]: role('read', 'read'),
    })
    const allowed = access({ login: 'resolver', repository })
    await expect(allowed.token(call('resolveReviewThread', { threadId: 'PRRT_1' }))).resolves.toBe('test')
    expect(allowed.requested).toEqual(['resolveReviewThread vercel/ai', 'getCollaboratorPermission vercel/private', 'resolveReviewThread vercel/private'])
    await expect(access({ login: 'onlooker', repository }).token(call('resolveReviewThread', { threadId: 'PRRT_1' })))
      .rejects.toMatchObject(refused('onlooker has read access to vercel/private, and `resolveReviewThread` needs write access.'))
    expect(requests.filter(route => route === 'POST /graphql')).toHaveLength(2)
  })

  it('refuses to resolve a review thread it can\'t find', async () => {
    stubGithub({ 'POST /graphql': { data: { node: null } } })
    await expect(access({ login: 'lost', repository }).token(call('resolveReviewThread', { threadId: 'PRRT_404' })))
      .rejects.toMatchObject(refused('The review thread can\'t be found, so lost\'s role on its repository can\'t be checked.'))
  })

  it('refuses gists, notifications and the tools that create a repository without asking GitHub', async () => {
    const requests = stubGithub({})
    const { token } = access({ login: 'creator', repository })
    for (const [name, input] of [
      ['createGist', { files: { 'a.md': { content: 'x' } } }],
      ['getGist', { gistId: '1' }],
      ['listNotifications', {}],
      ['markNotificationRead', { threadId: '1' }],
    ] as const) {
      await expect(token(call(name, input))).rejects.toMatchObject(refused(`\`${name}\` names no repository, so creator's role can't be checked for it.`))
    }
    await expect(token(call('createRepository', { name: 'sandbox', org: 'vercel' }))).rejects.toMatchObject({ code: 'github_tools.CALLER_FORBIDDEN' })
    await expect(token(call('forkRepository', { owner: 'vercel', repo: 'ai' }))).rejects.toMatchObject({ code: 'github_tools.CALLER_FORBIDDEN' })
    expect(requests).toEqual([])
  })
})
