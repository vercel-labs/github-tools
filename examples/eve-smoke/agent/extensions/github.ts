import githubExtension from '@github-tools/eve-extension'
import { routingModel } from '../../fixtures/routing'

const originalFetch = globalThis.fetch

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

globalThis.fetch = async (input, init) => {
  const request = new Request(input, init)
  const url = new URL(request.url)
  if (url.hostname !== 'api.github.com') return originalFetch(input, init)
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
  if (request.method === 'GET' && url.pathname === '/repos/vercel-labs/github-tools/branches') {
    return json([{ name: 'main', commit: { sha: 'abc123' }, protected: true }])
  }
  if (request.method === 'POST' && url.pathname === '/repos/vercel-labs/github-tools/issues') {
    const { title } = await request.json() as { title: string }
    return json({ number: 4242, title, html_url: 'https://github.com/vercel-labs/github-tools/issues/4242', state: 'open', labels: [], user: { login: 'smoke' } }, 201)
  }
  return json({ message: `Unexpected ${request.method} ${url.pathname}` }, 500)
}

export default githubExtension({
  token: 'ghp_smoke',
  preset: 'auto',
  evaluation: { model: routingModel },
  requireApproval: { createIssue: 'once' },
  overrides: { getRepository: { description: 'Smoke: get repository' } },
})
