import { describe, expect, it, vi } from 'vitest'
import { createOctokit } from '../client'
import { githubRepositoryApprover, normalizeGithubPermission } from './approver'

vi.mock('../client', () => ({ createOctokit: vi.fn() }))

const mockedCreateOctokit = vi.mocked(createOctokit)
const permissions = ['none', 'read', 'triage', 'write', 'maintain', 'admin'] as const
const minimumPermissions = ['read', 'triage', 'write', 'maintain', 'admin'] as const
const nextMinimumPermission = {
  read: 'triage',
  triage: 'write',
  write: 'maintain',
  maintain: 'admin',
} as const
let responseAuth: { getToken: ReturnType<typeof vi.fn> }

function permissionFlags(permission: typeof permissions[number]) {
  return {
    ...(permission === 'read' && { pull: true }),
    ...(permission === 'triage' && { triage: true }),
    ...(permission === 'write' && { push: true }),
    ...(permission === 'maintain' && { maintain: true }),
    ...(permission === 'admin' && { admin: true }),
  }
}

function setup(permission: typeof permissions[number] = 'write') {
  const getToken = vi.fn().mockResolvedValue({ token: 'responder-token' })
  const getAuthenticated = vi.fn().mockResolvedValue({ data: { login: 'octocat' } })
  const getCollaboratorPermissionLevel = vi.fn().mockResolvedValue({
    data: { user: { permissions: permissionFlags(permission) } },
  })
  mockedCreateOctokit.mockImplementation(token => ({
    rest: token === 'responder-token'
      ? { users: { getAuthenticated } }
      : { repos: { getCollaboratorPermissionLevel } },
  }) as never)

  responseAuth = { getToken }
  return { getToken, getAuthenticated, getCollaboratorPermissionLevel }
}

function respond(approver: ReturnType<typeof githubRepositoryApprover>, toolInput: unknown = { owner: 'vercel', repo: 'sdk' }) {
  return approver({ auth: responseAuth, request: { toolInput } } as never)
}

describe('normalizeGithubPermission', () => {
  it.each(permissions)('normalizes %s permission', permission => {
    expect(normalizeGithubPermission(permissionFlags(permission))).toBe(permission)
  })

  it('selects the highest permission when GitHub returns multiple flags', () => {
    expect(normalizeGithubPermission({ pull: true, push: true, admin: true })).toBe('admin')
  })
})

describe('githubRepositoryApprover', () => {
  it.each(minimumPermissions)('allows %s when it meets the configured threshold', async minimumPermission => {
    setup(minimumPermission)
    const result = await respond(githubRepositoryApprover({ auth: {} as never, agentToken: 'agent-token', minimumPermission }))
    expect(result).toEqual({ status: 'allowed' })
  })

  it.each(['read', 'triage', 'write', 'maintain'] as const)('rejects %s when it does not meet the next threshold', async permission => {
    const nextPermission = nextMinimumPermission[permission]
    setup(permission)
    const result = await respond(githubRepositoryApprover({ auth: {} as never, agentToken: 'agent-token', minimumPermission: nextPermission }))
    expect(result).toMatchObject({ status: 'rejected' })
  })

  it.each([undefined, {}, { owner: 1, repo: 'sdk' }, { owner: 'vercel', repo: 1 }])(
    'rejects tool input without string owner and repo',
    async toolInput => {
      const { getToken } = setup()
      const approver = githubRepositoryApprover({ auth: {} as never, agentToken: 'agent-token' })
      const result = await approver({ auth: responseAuth, request: { toolInput } } as never)
      expect(result).toMatchObject({ status: 'rejected' })
      expect(getToken).not.toHaveBeenCalled()
    },
  )

  it('uses the user-scoped provider for identity and the agent token for repository policy', async () => {
    const { getToken, getCollaboratorPermissionLevel } = setup()
    const provider = {} as never
    await respond(githubRepositoryApprover({ auth: provider, agentToken: 'agent-token' }))

    expect(getToken).toHaveBeenCalledWith(provider, { authKey: 'github-approver', displayName: 'GitHub' })
    expect(mockedCreateOctokit).toHaveBeenNthCalledWith(1, 'responder-token')
    expect(mockedCreateOctokit).toHaveBeenNthCalledWith(2, 'agent-token')
    expect(getCollaboratorPermissionLevel).toHaveBeenCalledWith({ owner: 'vercel', repo: 'sdk', username: 'octocat' })
  })

  it('converts a missing collaborator to a rejection', async () => {
    const { getCollaboratorPermissionLevel } = setup()
    getCollaboratorPermissionLevel.mockRejectedValue({ status: 404 })

    await expect(respond(githubRepositoryApprover({ auth: {} as never, agentToken: 'agent-token' }))).resolves.toMatchObject({ status: 'rejected' })
  })

  it('propagates GitHub failures other than 404', async () => {
    const { getCollaboratorPermissionLevel } = setup()
    const error = Object.assign(new Error('GitHub unavailable'), { status: 500 })
    getCollaboratorPermissionLevel.mockRejectedValue(error)

    await expect(respond(githubRepositoryApprover({ auth: {} as never, agentToken: 'agent-token' }))).rejects.toThrow(error)
  })
})
