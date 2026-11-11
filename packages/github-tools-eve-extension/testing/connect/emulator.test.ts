import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { startGithubEmulator, type GithubEmulator } from '../github/emulator'
import { startConnectEmulator, type ConnectEmulator } from './emulator'

const people = { alice: { role: 'write' }, erin: { role: 'read', authorized: false } } as const
let github: GithubEmulator
let connect: ConnectEmulator

const post = (path: string, body: unknown, method = 'POST') => fetch(`${connect.url}/v1/connect/${path}`, {
  method,
  headers: { 'authorization': 'Bearer oidc', 'content-type': 'application/json' },
  body: JSON.stringify(body),
})
const user = (id: string) => ({ subject: { type: 'user', id, issuer: 'https://eval.local' }, scopes: ['*'] })
const githubAs = (token: string, method: string, path: string, body?: unknown) => fetch(`${github.url}${path}`, {
  method,
  headers: { 'authorization': `Bearer ${token}`, 'content-type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
})

beforeAll(async () => {
  github = await startGithubEmulator({ repositories: { 'acme/web': { labels: ['bug'] } }, people })
  connect = await startConnectEmulator(github, people)
})

beforeEach(async () => {
  await github.reset()
  connect.reset()
})

afterAll(() => Promise.all([github.close(), connect.close()]))

describe('the Vercel Connect emulator', () => {
  it('mints an installation token narrowed to the scopes the request asks for', async () => {
    const response = await post('token/github%2Fmy-agent', {
      subject: { type: 'app' },
      authorizationDetails: [{ type: 'github_app_installation', org: 'acme', repositories: ['web'] }],
      scopes: ['contents:read', 'metadata:read', 'issues:read'],
    })
    const { token, expiresAt } = await response.json() as { token: string, expiresAt: number }
    expect(response.status).toBe(200)
    expect(expiresAt).toBeGreaterThan(Date.now())
    const { number } = await github.request<{ number: number }>('alice', 'POST', '/repos/acme/web/issues', { title: 'Crash on save' })
    expect((await githubAs(token, 'GET', `/repos/acme/web/issues/${number}`)).status).toBe(200)
    // The scopes had no `issues:write`, so GitHub refuses a write with this token.
    expect((await githubAs(token, 'POST', '/repos/acme/web/issues', { title: 'x' })).status).toBe(403)
    expect((await githubAs(token, 'POST', `/repos/acme/web/issues/${number}/reactions`, { content: 'eyes' })).status).toBe(403)
  })

  it('refuses scopes the App does not have, and an owner it is not installed on', async () => {
    const beyond = await post('token/github%2Fmy-agent', { subject: { type: 'app' }, scopes: ['secret_scanning_alerts:write'] })
    expect([beyond.status, (await beyond.json() as { error: { code: string } }).error.code]).toEqual([403, 'forbidden'])
    const elsewhere = await post('token/github%2Fmy-agent', { subject: { type: 'app' }, authorizationDetails: [{ type: 'github_app_installation', org: 'other' }] })
    expect([elsewhere.status, (await elsewhere.json() as { error: { code: string } }).error.code]).toEqual([403, 'connector_installation_required'])
  })

  it('answers a connected person with a token GitHub knows as them', async () => {
    const { token } = await (await post('token/github%2Fmy-agent', user('alice'))).json() as { token: string }
    expect((await (await githubAs(token, 'GET', '/user')).json() as { login: string }).login).toBe('alice')
  })

  it('asks a person who has not authorized to sign in, then issues a token GitHub knows', async () => {
    const before = await post('token/github%2Fmy-agent', user('erin'))
    expect([before.status, await before.json()]).toEqual([403, { error: { code: 'user_authorization_required', message: 'User has not authorized the connector.' } }])

    const authorize = await post('authorize/github%2Fmy-agent', { ...user('erin'), returnUrl: 'http://localhost:3000/callback', deviceCode: true })
    expect(await authorize.json()).toMatchObject({ url: 'http://localhost:3000/callback', connector: { uid: 'github/my-agent', serviceName: 'GitHub' } })

    const { token } = await (await post('token/github%2Fmy-agent', user('erin'))).json() as { token: string }
    expect((await (await githubAs(token, 'GET', '/user')).json() as { login: string }).login).toBe('erin')
    expect(connect.requests.map(request => `${request.route} ${request.body?.subject?.id} ${request.status}`)).toEqual(['token erin 403', 'authorize erin 200', 'token erin 200'])
  })

  it('refuses a sign-in for someone who is not a seeded person', async () => {
    expect((await post('authorize/github%2Fmy-agent', user('nobody'))).status).toBe(404)
  })

  it('revokes a person\'s token at GitHub, from the eval and from the route @vercel/connect calls', async () => {
    const { token } = await (await post('token/github%2Fmy-agent', user('alice'))).json() as { token: string }
    connect.revoke('alice')
    expect([(await githubAs(token, 'GET', '/repos/acme/web')).status, (await post('token/github%2Fmy-agent', user('alice'))).status]).toEqual([401, 403])

    await post('authorize/github%2Fmy-agent', { ...user('alice'), returnUrl: 'http://localhost:3000/callback' })
    const again = await (await post('token/github%2Fmy-agent', user('alice'))).json() as { token: string }
    expect(again.token).not.toBe(token)
    expect((await post('connectors/github%2Fmy-agent/tokens', { subject: { type: 'user', id: 'alice' } }, 'DELETE')).status).toBe(200)
    expect((await githubAs(again.token, 'GET', '/repos/acme/web')).status).toBe(401)
  })

  it('names the App in the connector metadata, and answers 404 to any other route', async () => {
    const metadata = await fetch(`${connect.url}/v1/connect/connectors/github%2Fmy-agent`, { headers: { authorization: 'Bearer oidc' } })
    expect(await metadata.json()).toMatchObject({ uid: 'github/my-agent', data: { appSlug: github.githubApp.slug } })
    const unknown = await post('install/github%2Fmy-agent', {})
    expect([unknown.status, (await unknown.json() as { error: { code: string } }).error.code]).toEqual([404, 'not_found'])
  })
})
