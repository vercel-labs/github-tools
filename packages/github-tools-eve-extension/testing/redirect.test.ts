import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONNECT_URL_ENV, GITHUB_URL_ENV, REDIRECT_MARKER } from './env'

const realFetch = globalThis.fetch

// Loads the preload as Node would, with a fetch that records where each request went.
async function load(env: Record<string, string | undefined>) {
  const seen: string[] = []
  globalThis.fetch = async (input) => {
    seen.push(input instanceof Request ? input.url : String(input))
    return new Response('{}')
  }
  vi.stubEnv('EVE_DEV', env.EVE_DEV)
  vi.stubEnv(GITHUB_URL_ENV, 'http://127.0.0.1:1111')
  vi.stubEnv(CONNECT_URL_ENV, 'http://127.0.0.1:2222')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.resetModules()
  await import('./redirect')
  return seen
}

afterEach(() => {
  globalThis.fetch = realFetch
  delete (globalThis as { [REDIRECT_MARKER]?: true })[REDIRECT_MARKER]
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('the fetch redirect', () => {
  it('sends api.github.com and Vercel Connect to the emulators', async () => {
    const seen = await load({ EVE_DEV: '1' })
    await fetch('https://api.github.com/repos/acme/web/issues?state=open')
    await fetch(new Request('https://api.github.com/graphql', { method: 'POST', body: '{}' }))
    await fetch('https://api.vercel.com/v1/connect/token/github%2Fmy-agent', { method: 'POST' })
    await fetch(new URL('https://api-iad1.vercel.com/v1/connect/connectors/github%2Fmy-agent'))
    expect(seen).toEqual([
      'http://127.0.0.1:1111/repos/acme/web/issues?state=open',
      'http://127.0.0.1:1111/graphql',
      'http://127.0.0.1:2222/v1/connect/token/github%2Fmy-agent',
      'http://127.0.0.1:2222/v1/connect/connectors/github%2Fmy-agent',
    ])
  })

  it('keeps the method, the headers, and the body of a redirected request', async () => {
    await load({ EVE_DEV: '1' })
    const sent = vi.fn<typeof fetch>(async () => new Response('{}'))
    delete (globalThis as { [REDIRECT_MARKER]?: true })[REDIRECT_MARKER]
    globalThis.fetch = sent
    vi.resetModules()
    await import('./redirect')
    await fetch(new Request('https://api.github.com/repos/acme/web/issues', { method: 'POST', headers: { authorization: 'token abc' }, body: '{"title":"x"}' }))
    const request = sent.mock.calls[0]![0] as Request
    expect([request.method, request.headers.get('authorization'), await request.text()]).toEqual(['POST', 'token abc', '{"title":"x"}'])
  })

  it('leaves other hosts and other api.vercel.com paths alone', async () => {
    const seen = await load({ EVE_DEV: '1' })
    await fetch('https://github.com/acme/web.git')
    await fetch('https://api.vercel.com/v2/user')
    await fetch('https://uploads.github.com/repos/acme/web/releases/1/assets')
    expect(seen).toEqual(['https://github.com/acme/web.git', 'https://api.vercel.com/v2/user', 'https://uploads.github.com/repos/acme/web/releases/1/assets'])
  })

  it('does nothing outside eve dev and eve eval', async () => {
    const seen = await load({ EVE_DEV: undefined })
    await fetch('https://api.github.com/repos/acme/web')
    expect(seen).toEqual(['https://api.github.com/repos/acme/web'])
    expect((globalThis as { [REDIRECT_MARKER]?: true })[REDIRECT_MARKER]).toBeUndefined()
  })
})
