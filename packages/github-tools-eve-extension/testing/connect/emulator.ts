import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import type { Context } from '@emulators/core'
import { ApiError, Hono, serve } from '../emulators.js'
import type { GithubEmulator, PersonSeed } from '../github/emulator.js'

/** One request the Connect emulator answered. */
export interface ConnectRequest {
  method: string
  /** `token`, `authorize`, `connectors`, or the path for a request with no route. */
  route: string
  connector?: string
  body?: {
    subject?: { type: string, id?: string, issuer?: string }
    scopes?: string[]
    authorizationDetails?: Array<{ type?: string, org?: string, repositories?: string[] }>
    returnUrl?: string
  }
  status: number
}

export type ConnectEmulator = Awaited<ReturnType<typeof startConnectEmulator>>

const error = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status })

/**
 * The Vercel Connect routes `@vercel/connect` calls for a GitHub connector, answered from the
 * GitHub emulator. Every connector name is the emulator's one GitHub App.
 */
export async function startConnectEmulator(github: GithubEmulator, people: Record<string, PersonSeed>) {
  const requests: ConnectRequest[] = []
  const tokens = new Map<string, string>()
  let issued = 0

  // A sign-in has to produce a token GitHub knows: one it doesn't is anonymous to emulate and `401` to the role guard.
  function issue(person: string): string {
    const token = `ghu_${person}_${++issued}`
    github.registerToken(token, person)
    tokens.set(person, token)
    return token
  }

  function seed(): void {
    for (const [person, { authorized = true }] of Object.entries(people)) {
      if (authorized) issue(person)
    }
  }
  seed()

  function revoke(person: string): void {
    const token = tokens.get(person)
    if (token) github.revokeToken(token)
    tokens.delete(person)
  }

  const app = new Hono()
  const connector = (c: Context) => ({ id: 'scl_emulator', uid: decodeURIComponent(c.req.param('connector')), serviceName: 'GitHub' })

  app.post('/v1/connect/token/:connector', async (c) => {
    const { subject, scopes = ['*'], authorizationDetails } = await c.req.json<NonNullable<ConnectRequest['body']>>()
    if (subject?.type === 'app') {
      // The scopes the extension derives from the mounted tools narrow the installation token, so a missing one fails in the eval.
      const permissions = scopes.includes('*')
        ? undefined
        : Object.fromEntries([...scopes].sort((a, b) => Number(a.endsWith(':write')) - Number(b.endsWith(':write'))).map(scope => scope.split(':')))
      const installation = authorizationDetails?.find(detail => detail.type === 'github_app_installation')
      const minted = await github.mintInstallationToken({ owner: installation?.org, permissions, repositories: installation?.repositories })
      if (minted.status === 404) return error(403, 'connector_installation_required', minted.message!)
      if (!minted.token) return error(403, 'forbidden', `GitHub refused the installation token: ${minted.message}`)
      return c.json({ token: minted.token, expiresAt: Date.parse(minted.expiresAt!), connector: connector(c) })
    }
    // People are keyed on the principal's ID. Its issuer is in the subject and isn't checked.
    const token = subject?.id === undefined ? undefined : tokens.get(subject.id)
    if (!token) return error(403, 'user_authorization_required', 'User has not authorized the connector.')
    return c.json({ token, expiresAt: Date.now() + 3_600_000, connector: connector(c) })
  })

  // Starting a sign-in stands in for the person consenting on GitHub. An eval finishes it by fetching `url` on the agent.
  app.post('/v1/connect/authorize/:connector', async (c) => {
    const { subject, returnUrl } = await c.req.json<NonNullable<ConnectRequest['body']>>()
    if (subject?.id === undefined || !github.people.includes(subject.id)) {
      return error(404, 'not_found', `No person "${subject?.id}" in the emulator. Seeded people: ${github.people.join(', ') || 'none'}.`)
    }
    revoke(subject.id)
    issue(subject.id)
    return c.json({ url: returnUrl, request: `req_${issued}`, verifier: `ver_${issued}`, connector: connector(c) })
  })

  app.get('/v1/connect/connectors/:connector', c => c.json({ ...connector(c), data: { appSlug: github.githubApp.slug } }))

  app.delete('/v1/connect/connectors/:connector/tokens', async (c) => {
    const { subject } = await c.req.json<NonNullable<ConnectRequest['body']>>()
    if (subject?.id !== undefined) revoke(subject.id)
    return c.json({})
  })

  app.notFound(c => error(404, 'not_found', `The Connect emulator has no route for ${c.req.method} ${c.req.path}.`))
  app.onError((thrown, c) => {
    if (thrown instanceof ApiError) return error(thrown.status, 'error', thrown.message)
    return error(500, 'internal_error', `The Connect emulator failed on ${c.req.method} ${c.req.path}: ${thrown instanceof Error ? thrown.message : String(thrown)}`)
  })

  const server = serve({
    port: 0,
    fetch: async (request) => {
      const body = request.method === 'GET' ? undefined : await request.clone().json().catch(() => undefined) as ConnectRequest['body']
      const response = await app.fetch(request)
      const [, , , route, name] = new URL(request.url).pathname.split('/')
      requests.push({ method: request.method, route: route ?? new URL(request.url).pathname, connector: name && decodeURIComponent(name), body, status: response.status })
      return response
    },
  })
  await once(server, 'listening')

  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    /** Every request answered, in order, with the subject and the scopes each token asked for. */
    requests,
    /**
     * Invalidates the token Connect holds for a person, at GitHub. `@vercel/connect` caches a token
     * in the agent until shortly before it expires, so the person's next call gets `401` from
     * GitHub, eve drops the cached token, and asks them to sign in.
     */
    revoke,
    /** Back to the seeded state. Call it after the GitHub emulator's `reset()`. */
    reset(): void {
      tokens.clear()
      requests.length = 0
      seed()
    },
    close: () => new Promise<void>((resolve, reject) => {
      server.close(failure => failure ? reject(failure) : resolve())
      server.closeAllConnections()
    }),
  }
}
