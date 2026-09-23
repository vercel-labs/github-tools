import { logLine } from './log.ts'

let installed = false

/**
 * Answers GitHub REST writes and GraphQL mutations with a fake success so benchmark
 * tasks never change a real repository. Reads still reach api.github.com.
 */
export function stubGithubWrites(tags: Record<string, string>) {
  if (installed) return
  installed = true
  const original = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    if (url.hostname !== 'api.github.com' || request.method === 'GET' || request.method === 'HEAD') return original(input, init)

    const text = await request.clone().text()
    const body = text ? JSON.parse(text) as Record<string, unknown> : {}
    if (url.pathname === '/graphql' && !/^\s*mutation\b/.test(String(body.query ?? ''))) return original(input, init)

    logLine('writes.jsonl', { ...tags, method: request.method, path: url.pathname, body })
    const number = Number(url.pathname.match(/\/(?:issues|pulls)\/(\d+)/)?.[1] ?? 1)
    const html_url = `https://github.com/stubbed${url.pathname}`
    const labels = Array.isArray(body.labels) ? body.labels.map(name => ({ name, color: 'ededed', description: null })) : []
    const fake = url.pathname === '/graphql'
      ? { data: {} }
      : url.pathname.endsWith('/labels')
        ? labels
        : request.method === 'PUT' && url.pathname.includes('/contents/')
          ? { content: { path: url.pathname.split('/contents/')[1], sha: 'stubbed', html_url }, commit: { sha: 'stubbed', html_url } }
          : url.pathname.endsWith('/git/refs')
            ? { ref: body.ref, url: html_url, object: { type: 'commit', sha: body.sha } }
            : { ...body, id: 1, number, html_url, state: 'open', labels, user: { login: 'bench' }, created_at: new Date().toISOString(), stubbed: true }
    return new Response(JSON.stringify(fake), { status: request.method === 'POST' ? 201 : 200, headers: { 'content-type': 'application/json' } })
  }
}
