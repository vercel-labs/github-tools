import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getToken, ConnectError, UserAuthorizationRequiredError, ConnectorInstallationRequiredError } = vi.hoisted(() => {
  class ConnectError extends Error {
    readonly status?: number
    constructor(message: string, options?: { status?: number }) {
      super(message)
      this.status = options?.status
    }
  }
  class UserAuthorizationRequiredError extends ConnectError {}
  class ConnectorInstallationRequiredError extends ConnectError {}
  return {
    getToken: vi.fn(async () => 'ghs_connect_token'),
    ConnectError,
    UserAuthorizationRequiredError,
    ConnectorInstallationRequiredError,
  }
})

vi.mock('@vercel/connect', () => ({
  getToken,
  ConnectError,
  UserAuthorizationRequiredError,
  ConnectorInstallationRequiredError,
}))

import { connectGithubToken } from './token'

function fakeJwt(expiresAt: Date): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const exp = Math.floor(expiresAt.getTime() / 1000)
  return `${encode({ alg: 'none' })}.${encode({ exp })}.signature`
}

function resolveConnectToken(
  connector: Parameters<typeof connectGithubToken>[0],
  options?: Parameters<typeof connectGithubToken>[1],
) {
  const resolve = connectGithubToken(connector, options)
  if (typeof resolve !== 'function') {
    throw new Error('expected async token provider')
  }
  return resolve
}

describe('connectGithubToken', () => {
  beforeEach(() => {
    getToken.mockClear()
    vi.stubEnv('VERCEL_OIDC_TOKEN', '')
  })

  it('calls getToken with app subject and preset-derived scopes', async () => {
    const resolve = resolveConnectToken('github/my-connector', {
      preset: 'code-review',
    })

    await expect(resolve()).resolves.toBe('ghs_connect_token')
    expect(getToken).toHaveBeenCalledWith('github/my-connector', {
      subject: { type: 'app' },
      scopes: [
        'contents:read',
        'metadata:read',
        'pull_requests:read',
        'pull_requests:write',
        'checks:read',
        'statuses:read',
      ],
    }, undefined)
  })

  it('uses scope override from params instead of preset mapping', async () => {
    const resolve = resolveConnectToken('github/my-connector', {
      preset: 'maintainer',
      params: { scopes: ['issues:write'] },
    })

    await resolve()
    expect(getToken).toHaveBeenCalledWith('github/my-connector', {
      subject: { type: 'app' },
      scopes: ['issues:write'],
    }, undefined)
  })

  it('derives scopes from include without requesting administration', async () => {
    const resolve = resolveConnectToken('github/my-connector', {
      include: ['getRepository', 'listIssues', 'addLabels'],
    })

    await resolve()
    expect(getToken).toHaveBeenCalledWith('github/my-connector', {
      subject: { type: 'app' },
      scopes: [
        'contents:read',
        'metadata:read',
        'issues:read',
        'issues:write',
      ],
    }, undefined)
  })

  it('passes an explicit user subject through instead of the app default', async () => {
    const resolve = resolveConnectToken('github/my-connector', {
      preset: 'issue-triage',
      params: { subject: { type: 'user', id: 'user_123', issuer: 'https://auth.example.com' } },
    })

    await resolve()
    expect(getToken).toHaveBeenCalledWith(
      'github/my-connector',
      expect.objectContaining({
        subject: { type: 'user', id: 'user_123', issuer: 'https://auth.example.com' },
      }),
      undefined,
    )
  })

  it('maps repositories to github_app_installation authorization details', async () => {
    const resolve = resolveConnectToken('github/my-connector', {
      preset: 'issue-triage',
      params: {
        installationId: 'inst_abc',
        repositories: ['vercel-labs/github-tools'],
      },
    })

    await resolve()
    expect(getToken).toHaveBeenCalledWith('github/my-connector', {
      subject: { type: 'app' },
      installationId: 'inst_abc',
      scopes: [
        'contents:read',
        'metadata:read',
        'issues:read',
        'issues:write',
      ],
      authorizationDetails: [{
        type: 'github_app_installation',
        repositories: ['vercel-labs/github-tools'],
      }],
    }, undefined)
  })

  it('passes VERCEL_OIDC_TOKEN as vercelToken so getToken does not walk cwd', async () => {
    vi.stubEnv('VERCEL_OIDC_TOKEN', 'oidc_from_env')
    const resolve = resolveConnectToken('github/my-connector', { preset: 'repo-explorer' })

    await resolve()
    expect(getToken).toHaveBeenCalledWith(
      'github/my-connector',
      expect.objectContaining({ subject: { type: 'app' } }),
      { vercelToken: 'oidc_from_env' },
    )
    vi.unstubAllEnvs()
  })

  it('does not override an explicit connectOptions.vercelToken', async () => {
    vi.stubEnv('VERCEL_OIDC_TOKEN', 'oidc_from_env')
    const resolve = resolveConnectToken('github/my-connector', {
      preset: 'repo-explorer',
      connectOptions: { vercelToken: 'explicit_oidc' },
    })

    await resolve()
    expect(getToken).toHaveBeenCalledWith(
      'github/my-connector',
      expect.objectContaining({ subject: { type: 'app' } }),
      { vercelToken: 'explicit_oidc' },
    )
    vi.unstubAllEnvs()
  })

  it('forwards connectOptions to getToken', async () => {
    const connectOptions = { forceRefresh: true }
    const resolve = resolveConnectToken('github/my-connector', {
      preset: 'repo-explorer',
      connectOptions,
    })

    await resolve()
    expect(getToken).toHaveBeenCalledWith(
      'github/my-connector',
      expect.objectContaining({ subject: { type: 'app' } }),
      connectOptions,
    )
  })

  it('resolves a sync function connector', async () => {
    const connectorFn = vi.fn(() => 'github/dynamic-connector')
    const resolve = resolveConnectToken(connectorFn, { preset: 'code-review' })

    expect(connectorFn).not.toHaveBeenCalled()

    await resolve()
    expect(connectorFn).toHaveBeenCalledTimes(1)
    expect(getToken).toHaveBeenCalledWith(
      'github/dynamic-connector',
      expect.objectContaining({ subject: { type: 'app' } }),
      undefined,
    )
  })

  it('resolves an async function connector', async () => {
    const connectorFn = vi.fn(async () => 'github/dynamic-connector')
    const resolve = resolveConnectToken(connectorFn, { preset: 'code-review' })

    await resolve()
    expect(getToken).toHaveBeenCalledWith(
      'github/dynamic-connector',
      expect.objectContaining({ subject: { type: 'app' } }),
      undefined,
    )
  })

  it('throws OIDC_TOKEN_EXPIRED for an expired VERCEL_OIDC_TOKEN without calling Connect', async () => {
    const expiredAt = new Date('2026-01-01T00:00:00.000Z')
    vi.stubEnv('VERCEL_OIDC_TOKEN', fakeJwt(expiredAt))
    const resolve = resolveConnectToken('github/my-connector', { preset: 'repo-explorer' })

    await expect(resolve()).rejects.toMatchObject({
      code: 'github_tools.OIDC_TOKEN_EXPIRED',
      message: expect.stringContaining('2026-01-01T00:00:00.000Z'),
      fix: expect.stringContaining('vercel env pull'),
    })
    expect(getToken).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('passes a still-valid VERCEL_OIDC_TOKEN through unchanged', async () => {
    const token = fakeJwt(new Date(Date.now() + 3_600_000))
    vi.stubEnv('VERCEL_OIDC_TOKEN', token)
    const resolve = resolveConnectToken('github/my-connector', { preset: 'repo-explorer' })

    await resolve()
    expect(getToken).toHaveBeenCalledWith(
      'github/my-connector',
      expect.anything(),
      { vercelToken: token },
    )
    vi.unstubAllEnvs()
  })

  it('maps UserAuthorizationRequiredError to CONNECT_USER_NOT_CONNECTED with the subject id', async () => {
    getToken.mockRejectedValueOnce(new UserAuthorizationRequiredError('authorization required'))
    const resolve = resolveConnectToken('github/my-connector', {
      preset: 'issue-triage',
      params: { subject: { type: 'user', id: 'user_123' } },
    })

    await expect(resolve()).rejects.toMatchObject({
      code: 'github_tools.CONNECT_USER_NOT_CONNECTED',
      message: expect.stringContaining('user_123'),
      fix: expect.stringContaining('connect their GitHub account'),
    })
  })

  it('maps ConnectorInstallationRequiredError to CONNECT_INSTALLATION_REQUIRED', async () => {
    getToken.mockRejectedValueOnce(new ConnectorInstallationRequiredError('installation required'))
    const resolve = resolveConnectToken('github/my-connector', { preset: 'issue-triage' })

    await expect(resolve()).rejects.toMatchObject({
      code: 'github_tools.CONNECT_INSTALLATION_REQUIRED',
      message: expect.stringContaining('installation required'),
    })
  })

  it('maps a Connect 403 to CONNECT_NOT_AUTHORIZED and names the process identity', async () => {
    getToken.mockRejectedValueOnce(new ConnectError('Not authorized', { status: 403 }))
    const resolve = resolveConnectToken('github/my-connector', { preset: 'issue-triage' })

    await expect(resolve()).rejects.toMatchObject({
      code: 'github_tools.CONNECT_NOT_AUTHORIZED',
      why: expect.stringContaining('never reached GitHub'),
    })
  })

  it('re-resolves a function connector on every call', async () => {
    let env = 'preview'
    const connectorFn = vi.fn(() => `github/${env}-connector`)
    const resolve = resolveConnectToken(connectorFn, { preset: 'code-review' })

    await resolve()
    expect(getToken).toHaveBeenLastCalledWith(
      'github/preview-connector',
      expect.anything(),
      undefined,
    )

    env = 'production'
    await resolve()
    expect(getToken).toHaveBeenLastCalledWith(
      'github/production-connector',
      expect.anything(),
      undefined,
    )
    expect(connectorFn).toHaveBeenCalledTimes(2)
  })
})
