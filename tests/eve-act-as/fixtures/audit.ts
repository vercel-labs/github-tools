import type githubExtension from '@github-tools/eve-extension'

type Audit = NonNullable<Parameters<typeof githubExtension>[0]['audit']>
type AuditRecord = Parameters<Audit>[0]

const records: AuditRecord[] = []
const requests: string[] = []

/** The records the `audit` function accepted and the GitHub requests for `vercel-labs/audited`, oldest first. */
export function audited() {
  return { records, requests }
}

// Stands in for an audit store. It rejects the `started` record of a write on issue 500, and
// rejects the outcome of a write on issue 501 for as long as that write's turn runs.
export const audit: Audit = (record, ctx) => {
  if (record.phase === 'started' && record.target.number === 500) throw new Error('The audit store is unavailable.')
  if (record.phase === 'settled' && record.target.number === 501 && record.session.turnId === ctx.session.turn.id) throw new Error('The audit store is unavailable.')
  records.push(record)
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/** GitHub's answers for `vercel-labs/audited`, kept apart from the other eval's request log. bob can only read it. */
export async function auditedGithub(request: Request, pathname: string, token: string) {
  requests.push(`${request.method} ${pathname} ${token}`)
  if (request.method === 'GET' && pathname === '/repos/vercel-labs/audited') {
    return json({ name: 'audited', full_name: 'vercel-labs/audited', description: 'stubbed-repo', html_url: 'https://github.com/vercel-labs/audited', default_branch: 'main', stargazers_count: 1, forks_count: 2, open_issues_count: 3 })
  }
  if (request.method !== 'POST') return json({ message: `Unexpected ${request.method} ${pathname}` }, 500)
  if (token === 'ghu_bob') return json({ message: 'Resource not accessible by integration' }, 403)
  const issue = pathname.match(/^\/repos\/vercel-labs\/audited\/issues\/(\d+)\/(comments|labels)$/)
  if (issue?.[2] === 'comments') {
    const { body } = await request.json() as { body: string }
    return json({ id: 9, html_url: `https://github.com/vercel-labs/audited/issues/${issue[1]}#issuecomment-9`, body, user: { login: 'eval[bot]' }, created_at: '2026-11-11T00:00:00Z' }, 201)
  }
  if (issue?.[2] === 'labels') {
    const { labels } = await request.json() as { labels: string[] }
    return json(labels.map(name => ({ name, color: 'ededed', description: null })))
  }
  if (pathname === '/repos/vercel-labs/audited/issues') {
    const { title } = await request.json() as { title: string }
    return json({ number: 4242, title, html_url: 'https://github.com/vercel-labs/audited/issues/4242', state: 'open', labels: [], user: { login: 'eval' } }, 201)
  }
  return json({ message: `Unexpected ${request.method} ${pathname}` }, 500)
}
