import { auditedGithub } from './audit'
import { recordGithubCall } from './github-calls'

// The GitHub token Vercel Connect holds for each user. `carol` and `erin` have not authorized
// the App yet, and `dave` revoked the authorization on GitHub after Connect stored their token.
// Starting a sign-in stands in for the user consenting: Connect then holds a fresh token for them.
const userTokens: Record<string, string> = {
  alice: 'ghu_alice',
  bob: 'ghu_bob',
  dave: 'ghu_revoked',
}

// GitHub's answer for each token: alice and carol maintain the repository, bob and erin can only
// read it, and the App installation can do both.
const canWrite = new Set(['ghu_alice', 'ghu_carol', 'ghs_app'])

// What GitHub's collaborator permission endpoint answers for the people who comment on GitHub.
// Nobody has access to `vercel-labs/private`.
const roles: Record<string, { permission: string, role_name: string }> = {
  'gh-writer': { permission: 'write', role_name: 'write' },
  'gh-reader': { permission: 'read', role_name: 'read' },
}

const originalFetch = globalThis.fetch

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

const exp = Math.floor(Date.now() / 1000) + 3600
process.env.VERCEL_OIDC_TOKEN = `e30.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.sig`

type ConnectBody = { subject: { type: string, id?: string }, returnUrl?: string }

globalThis.fetch = async (input, init) => {
  const request = new Request(input, init)
  const url = new URL(request.url)

  if (url.hostname === 'api.vercel.com' && url.pathname === '/v1/connect/token/github%2Feval') {
    const { subject } = await request.json() as ConnectBody
    if (subject.type === 'app') return json({ token: 'ghs_app', expiresAt: Date.now() + 3_600_000 })
    const token = subject.id ? userTokens[subject.id] : undefined
    if (!token) return json({ error: { code: 'user_authorization_required', message: 'User has not authorized the connector.' } }, 403)
    return json({ token, expiresAt: Date.now() + 3_600_000 })
  }
  if (url.hostname === 'api.vercel.com' && url.pathname === '/v1/connect/authorize/github%2Feval') {
    const { subject, returnUrl } = await request.json() as ConnectBody
    userTokens[subject.id!] = `ghu_${subject.id}`
    return json({ url: returnUrl, connector: { serviceName: 'GitHub' } })
  }

  // Only the local eve server is reachable, so the eval can never use a real token or service.
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return originalFetch(input, init)
  if (url.hostname !== 'api.github.com') {
    console.error(`[stubs] blocked ${request.method} ${url.href}`)
    return json({ message: `Blocked ${request.method} ${url.hostname} in the eval` }, 599)
  }
  const token = request.headers.get('authorization')?.replace(/^(token|bearer) /i, '') ?? ''
  if (url.pathname.startsWith('/repos/vercel-labs/audited')) return auditedGithub(request, url.pathname, token)
  recordGithubCall(`${request.method} ${url.pathname} ${token}`)
  if (!/^gh[us]_/.test(token) || token === 'ghu_revoked') return json({ message: 'Bad credentials' }, 401)

  const collaborator = url.pathname.match(/^\/repos\/vercel-labs\/(github-tools|private)\/collaborators\/([^/]+)\/permission$/)
  if (request.method === 'GET' && collaborator) {
    const [, repo, login] = collaborator
    const role = repo === 'github-tools' ? roles[login!] : undefined
    return json({ ...(role ?? { permission: 'none', role_name: '' }), user: { login, id: 1 } })
  }
  // The App's token reaches both repositories, and the review thread `PRRT_1` is in `github-tools`.
  if (request.method === 'GET' && url.pathname === '/installation/repositories') {
    return json({ total_count: 2, repositories: [{ full_name: 'vercel-labs/github-tools' }, { full_name: 'vercel-labs/private' }] })
  }
  if (request.method === 'POST' && url.pathname === '/graphql') {
    const { query } = await request.json() as { query: string }
    return query.includes('mutation')
      ? json({ data: { resolveReviewThread: { thread: { id: 'PRRT_1', isResolved: true } } } })
      : json({ data: { node: { repository: { name: 'github-tools', owner: { login: 'vercel-labs' } } } } })
  }
  // The GitHub channel reacts to the comment that starts a turn and posts the reply on its issue.
  if (request.method === 'POST' && /^\/repos\/vercel-labs\/github-tools\/issues\/comments\/\d+\/reactions$/.test(url.pathname)) {
    return json({ id: 1, content: 'eyes' }, 201)
  }
  if (request.method === 'POST' && url.pathname === '/repos/vercel-labs/github-tools/issues/7/comments') {
    const { body } = await request.json() as { body: string }
    return json({ id: 78, html_url: 'https://github.com/vercel-labs/github-tools/issues/7#issuecomment-78', body, user: { login: 'eval[bot]' }, created_at: '2026-11-06T00:00:00Z' }, 201)
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
  if (request.method === 'POST' && url.pathname === '/repos/vercel-labs/github-tools/issues') {
    if (!canWrite.has(token)) return json({ message: 'Resource not accessible by integration' }, 403)
    const { title } = await request.json() as { title: string }
    return json({ number: 4242, title, html_url: 'https://github.com/vercel-labs/github-tools/issues/4242', state: 'open', labels: [], user: { login: 'eval' } }, 201)
  }
  if (request.method === 'POST' && url.pathname === '/repos/vercel-labs/github-tools/issues/1/comments') {
    if (!canWrite.has(token)) return json({ message: 'Resource not accessible by integration' }, 403)
    const { body } = await request.json() as { body: string }
    return json({ id: 77, html_url: 'https://github.com/vercel-labs/github-tools/issues/1#issuecomment-77', body, user: { login: 'eval[bot]' }, created_at: '2026-11-06T00:00:00Z' }, 201)
  }
  return json({ message: `Unexpected ${request.method} ${url.pathname}` }, 500)
}
