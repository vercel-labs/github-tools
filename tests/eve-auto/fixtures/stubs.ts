import { recorded } from './record'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

const exp = Math.floor(Date.now() / 1000) + 3600
process.env.VERCEL_OIDC_TOKEN = `e30.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.sig`

const originalFetch = globalThis.fetch

globalThis.fetch = async (input, init) => {
  const request = new Request(input, init)
  const url = new URL(request.url)

  if (url.hostname === 'api.vercel.com' && url.pathname === '/v1/connect/token/github%2Feval') {
    const { scopes } = await request.json() as { scopes: string[] }
    recorded().connectScopes.push(scopes.join(' '))
    return json({ token: 'ghs_app', expiresAt: Date.now() + 3_600_000 })
  }
  // Only the local eve server is reachable, so the eval can never use a real token or service.
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return originalFetch(input, init)
  if (url.hostname !== 'api.github.com') {
    console.error(`[stubs] blocked ${request.method} ${url.href}`)
    return json({ message: `Blocked ${request.method} ${url.hostname} in the eval` }, 599)
  }

  if (request.method === 'GET' && url.pathname === '/repos/vercel-labs/github-tools') {
    return json({
      name: 'github-tools',
      full_name: 'vercel-labs/github-tools',
      description: 'stubbed-repo',
      html_url: 'https://github.com/vercel-labs/github-tools',
      default_branch: 'main',
      stargazers_count: 1,
      forks_count: 2,
      open_issues_count: 3,
    })
  }
  if (request.method === 'POST' && url.pathname === '/repos/vercel-labs/github-tools/issues/12/labels') {
    const { labels } = await request.json() as { labels: string[] }
    return json(labels.map(name => ({ name, color: 'ededed', description: null })))
  }
  return json({ message: `Unexpected ${request.method} ${url.pathname}` }, 500)
}
