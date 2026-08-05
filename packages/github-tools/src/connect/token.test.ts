import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn(async () => 'ghs_connect_token'),
}))

vi.mock('@vercel/connect', () => ({
  getToken,
}))

import { connectGithubToken } from './token'

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
