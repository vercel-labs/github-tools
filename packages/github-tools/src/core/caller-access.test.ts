import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeGithubEveTool } from '../eve-runtime'
import { githubCallerViolation, githubRoleRank, withGithubCallerAccess } from './caller-access'
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

const role = (permission: string, role_name: string) => ({ permission, role_name, user: { login: 'x', id: 1 } })
const permissionRoute = (repo: string, login: string) => `GET /repos/${repo}/collaborators/${login}/permission`

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

describe('githubCallerViolation', () => {
  it('lets a reader read and refuses their write', async () => {
    stubGithub({ [permissionRoute('vercel/ai', 'reader')]: role('read', 'read') })
    const caller = { login: 'reader' }
    await expect(githubCallerViolation(call('getRepository', { owner: 'vercel', repo: 'ai' }), caller, 'test')).resolves.toBeUndefined()
    await expect(githubCallerViolation(call('createIssue', { owner: 'vercel', repo: 'ai', title: 'x' }), caller, 'test'))
      .resolves.toBe('reader has read access to vercel/ai, and `createIssue` needs write access.')
  })

  it('lets a triager read only, and a maintainer write', async () => {
    stubGithub({
      [permissionRoute('vercel/ai', 'triager')]: role('read', 'triage'),
      [permissionRoute('vercel/ai', 'maintainer')]: role('write', 'maintain'),
    })
    await expect(githubCallerViolation(call('addLabels', { owner: 'vercel', repo: 'ai', issueNumber: 1, labels: ['bug'] }), { login: 'triager' }, 'test'))
      .resolves.toContain('triager has triage access')
    await expect(githubCallerViolation(call('mergePullRequest', { owner: 'vercel', repo: 'ai', pullNumber: 1 }), { login: 'maintainer' }, 'test')).resolves.toBeUndefined()
  })

  it('refuses a read of a repository the caller has no access to', async () => {
    stubGithub({ [permissionRoute('vercel/private', 'outsider')]: role('none', '') })
    await expect(githubCallerViolation(call('getFileContent', { owner: 'vercel', repo: 'private', path: 'README.md' }), { login: 'outsider' }, 'test'))
      .resolves.toBe('outsider has no access to vercel/private, and `getFileContent` needs read access.')
  })

  it('checks the sub-issue\'s repository of addSubIssue', async () => {
    stubGithub({
      [permissionRoute('vercel/ai', 'planner')]: role('write', 'write'),
      [permissionRoute('vercel/private', 'planner')]: role('none', ''),
    })
    await expect(githubCallerViolation(call('addSubIssue', { owner: 'vercel', repo: 'ai', issueNumber: 1, subIssueNumber: 2, subIssueRepo: 'private' }), { login: 'planner' }, 'test'))
      .resolves.toContain('planner has no access to vercel/private')
  })

  it('refuses the tools that create a repository without asking GitHub', async () => {
    const requests = stubGithub({})
    await expect(githubCallerViolation(call('createRepository', { name: 'sandbox', org: 'vercel' }), { login: 'creator' }, 'test')).resolves.toContain('`createRepository` creates a repository')
    await expect(githubCallerViolation(call('forkRepository', { owner: 'vercel', repo: 'ai' }), { login: 'creator' }, 'test')).resolves.toContain('`forkRepository` creates a repository')
    expect(requests).toEqual([])
  })

  it('asks GitHub once for several calls by the same person on the same repository', async () => {
    const requests = stubGithub({ [permissionRoute('vercel/ai', 'repeat')]: role('write', 'write') })
    await githubCallerViolation(call('getRepository', { owner: 'vercel', repo: 'ai' }), { login: 'repeat' }, 'test')
    await githubCallerViolation(call('createIssue', { owner: 'Vercel', repo: 'AI', title: 'x' }), { login: 'Repeat' }, 'test')
    expect(requests).toEqual([permissionRoute('vercel/ai', 'repeat')])
  })

  it('fails when GitHub can\'t answer, and asks again next time', async () => {
    const requests = stubGithub({})
    const check = () => githubCallerViolation(call('getRepository', { owner: 'vercel', repo: 'ai' }), { login: 'ghost' }, 'test')
    await expect(check()).rejects.toMatchObject({ code: 'github_tools.NOT_FOUND' })
    await expect(check()).rejects.toMatchObject({ code: 'github_tools.NOT_FOUND' })
    expect(requests).toHaveLength(2)
  })
})

describe('withGithubCallerAccess', () => {
  it('requests the role with a token for getCollaboratorPermission, then the call\'s own token', async () => {
    stubGithub({ [permissionRoute('vercel/ai', 'writer')]: role('write', 'write') })
    const calls: (GithubTokenCall | undefined)[] = []
    const token = withGithubCallerAccess(async (requested) => {
      calls.push(requested)
      return 'test'
    }, { login: 'writer' })
    await expect(token(call('createIssue', { owner: 'vercel', repo: 'ai', title: 'x' }))).resolves.toBe('test')
    expect(calls.map(requested => `${requested?.toolName} ${requested?.owner}/${requested?.repo}`)).toEqual(['getCollaboratorPermission vercel/ai', 'createIssue vercel/ai'])
  })

  it('throws CALLER_FORBIDDEN before the call\'s token is requested', async () => {
    stubGithub({ [permissionRoute('vercel/ai', 'visitor')]: role('read', 'read') })
    const calls: (string | undefined)[] = []
    const token = withGithubCallerAccess(async (requested) => {
      calls.push(requested?.toolName)
      return 'test'
    }, { login: 'visitor' })
    await expect(token(call('createIssue', { owner: 'vercel', repo: 'ai', title: 'x' }))).rejects.toMatchObject({
      code: 'github_tools.CALLER_FORBIDDEN',
      message: 'Not allowed for the person who asked: visitor has read access to vercel/ai, and `createIssue` needs write access.',
    })
    expect(calls).toEqual(['getCollaboratorPermission'])
  })

  it('requests a token for the caller\'s repository when the call has no target', async () => {
    const requests = stubGithub({})
    const calls: (GithubTokenCall | undefined)[] = []
    const token = withGithubCallerAccess(async (requested) => {
      calls.push(requested)
      return 'test'
    }, { login: 'searcher', repository: { owner: 'vercel', repo: 'ai' } })
    await token(call('searchCode', { query: 'token' }))
    expect(calls).toMatchObject([{ toolName: 'searchCode', owner: 'vercel', repo: 'ai' }])
    expect(requests).toEqual([])
  })

  it('returns the refusal as an error result from an eve tool, without calling the tool\'s endpoint', async () => {
    const requests = stubGithub({ [permissionRoute('vercel/ai', 'guest')]: role('read', 'read') })
    const result = await executeGithubEveTool('createIssue', { owner: 'vercel', repo: 'ai', title: 'x' }, { token: withGithubCallerAccess('test', { login: 'guest' }) })
    expect(result).toMatchObject({ error: { code: 'github_tools.CALLER_FORBIDDEN' } })
    expect(requests).toEqual([permissionRoute('vercel/ai', 'guest')])
  })
})
