import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCiFailureContextCore, getPullRequestContextCore, getReleaseContextCore } from './bundles'
import { getReleaseCore } from './releases'

type Route = (url: URL, init?: RequestInit) => Response | undefined

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function stubGithub(route: Route) {
  const requests: string[] = []
  vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>(async (input, init) => {
    // Octokit encodes path parameters, such as the @ in a monorepo tag.
    const url = new URL(decodeURIComponent(String(input)))
    requests.push(`${init?.method ?? 'GET'} ${url.pathname}`)
    return route(url, init) ?? json({ message: 'Not Found' }, 404)
  }))
  return requests
}

const release = (id: number, tag: string, draft = false) => ({ id, tag_name: tag, name: tag, body: '', draft, prerelease: false, html_url: `https://github.com/vercel/ai/releases/${tag}`, author: { login: 'octocat' }, created_at: '2026-01-01T00:00:00Z', published_at: '2026-01-01T00:00:00Z', assets: [] })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getCiFailureContext with runId', () => {
  const job = (id: number, conclusion: string) => ({ id, name: `job ${id}`, status: 'completed', conclusion, html_url: `https://github.com/vercel/ai/actions/runs/7/job/${id}`, started_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-01T00:01:00Z', steps: [{ name: 'test', status: 'completed', conclusion, number: 1 }] })

  it('diagnoses one run in a single call, with the end of each failed job\'s log', async () => {
    const requests = stubGithub((url) => {
      if (url.pathname === '/repos/vercel/ai/actions/runs/7') return json({ id: 7, name: 'CI', status: 'completed', conclusion: 'failure', head_branch: 'main', head_sha: 'abc', event: 'push', html_url: 'https://github.com/vercel/ai/actions/runs/7', actor: { login: 'octocat' } })
      if (url.pathname === '/repos/vercel/ai/actions/runs/7/jobs') return json({ total_count: 3, jobs: [job(1, 'failure'), job(2, 'success'), job(3, 'failure')] })
      if (url.pathname === '/repos/vercel/ai/actions/jobs/1/logs') return new Response('setup\nError: expected 2 to be 3\n')
      if (url.pathname === '/repos/vercel/ai/actions/jobs/3/logs') return json({ message: 'Gone' }, 410)
    })
    const result = await getCiFailureContextCore({ token: 'test', owner: 'vercel', repo: 'ai', runId: 7, maxFailedRuns: 5, maxFailedJobs: 10, logLines: 1 })
    expect(result).toMatchObject({ run: { id: 7, conclusion: 'failure' } })
    expect('failedJobs' in result && result.failedJobs).toEqual([
      expect.objectContaining({ id: 1, log: 'Error: expected 2 to be 3', omittedLogLines: 1 }),
      expect.objectContaining({ id: 3, logError: expect.any(String) }),
    ])
    expect(requests).not.toContain('GET /repos/vercel/ai/actions/jobs/2/logs')
  })

  it('needs ref or runId', async () => {
    await expect(getCiFailureContextCore({ token: 'test', owner: 'vercel', repo: 'ai', maxFailedRuns: 5, maxFailedJobs: 10, logLines: 40 })).rejects.toThrow('`ref` or `runId`')
  })
})

describe('releases by tag', () => {
  it('fetches a release by tag', async () => {
    const requests = stubGithub(url => url.pathname === '/repos/vercel/ai/releases/tags/v2.0.0' ? json(release(20, 'v2.0.0')) : undefined)
    await expect(getReleaseCore({ token: 'test', owner: 'vercel', repo: 'ai', tag: 'v2.0.0' })).resolves.toMatchObject({ id: 20, tagName: 'v2.0.0' })
    expect(requests).toEqual(['GET /repos/vercel/ai/releases/tags/v2.0.0'])
  })

  it('compares an older release with the one published before it, not with the latest', async () => {
    stubGithub((url) => {
      if (url.pathname === '/repos/vercel/ai/releases/tags/v2.0.0') return json(release(20, 'v2.0.0'))
      if (url.pathname === '/repos/vercel/ai/releases') return json([release(40, 'v4.0.0-draft', true), release(30, 'v3.0.0'), release(20, 'v2.0.0'), release(15, 'v1.5.0-draft', true), release(10, 'v1.0.0')])
      if (url.pathname === '/repos/vercel/ai/compare/v1.0.0...v2.0.0') return json({ status: 'ahead', ahead_by: 3, behind_by: 0, total_commits: 3, commits: [], files: [], html_url: '' })
    })
    const result = await getReleaseContextCore({ token: 'test', owner: 'vercel', repo: 'ai', tag: 'v2.0.0', includePrevious: true, includeCompare: true })
    expect(result.release.tagName).toBe('v2.0.0')
    expect(result.previousRelease?.tagName).toBe('v1.0.0')
  })
})

describe('getReleaseContext with previousTag', () => {
  it('compares against the given tag instead of the release published before', async () => {
    const requests = stubGithub((url) => {
      if (url.pathname === '/repos/vercel/ai/releases/tags/sdk@2.0.0') return json(release(20, 'sdk@2.0.0'))
      if (url.pathname === '/repos/vercel/ai/releases/tags/sdk@1.0.0') return json(release(10, 'sdk@1.0.0'))
      if (url.pathname === '/repos/vercel/ai/compare/sdk@1.0.0...sdk@2.0.0') return json({ status: 'ahead', ahead_by: 3, behind_by: 0, total_commits: 3, commits: [], files: [], html_url: '' })
    })
    const result = await getReleaseContextCore({ token: 'test', owner: 'vercel', repo: 'ai', tag: 'sdk@2.0.0', previousTag: 'sdk@1.0.0', includePrevious: true, includeCompare: true })
    expect(result.previousRelease?.tagName).toBe('sdk@1.0.0')
    expect(result.comparison).toBeDefined()
    expect(requests).not.toContain('GET /repos/vercel/ai/releases')
  })
})

describe('getPullRequestContext with includeLinkedIssues', () => {
  it('lists the issues the pull request closes', async () => {
    stubGithub((url, init) => {
      if (url.pathname === '/repos/vercel/ai/pulls/12') return json({ number: 12, title: 'Fix retries', state: 'open', body: 'Fixes #5', user: { login: 'octocat' }, head: { ref: 'fix', sha: 'abc' }, base: { ref: 'main' }, html_url: '', draft: false, merged: false, mergeable: true, additions: 1, deletions: 1, changed_files: 1, created_at: '', updated_at: '' })
      if (url.pathname === '/graphql' && init?.method === 'POST') return json({ data: { repository: { pullRequest: { closingIssuesReferences: { nodes: [{ number: 5, title: 'Retries fail', state: 'OPEN', url: 'https://github.com/vercel/ai/issues/5', repository: { nameWithOwner: 'vercel/ai' } }] } } } } })
    })
    const result = await getPullRequestContextCore({ token: 'test', owner: 'vercel', repo: 'ai', pullNumber: 12, includeFiles: false, includeReviews: false, includeChecks: false, includePatch: false, filesPerPage: 100, includeLinkedIssues: true })
    expect(result.linkedIssues).toEqual([{ repository: 'vercel/ai', number: 5, title: 'Retries fail', state: 'OPEN', url: 'https://github.com/vercel/ai/issues/5' }])
  })
})
