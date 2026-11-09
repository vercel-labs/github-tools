import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPullRequestReviewCore } from './pull-requests'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createPullRequestReview', () => {
  it('sends a multi-line suggestion as a start_line to line range', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(JSON.stringify({ id: 1, state: 'COMMENTED', body: '', html_url: 'https://github.com/vercel/ai/pull/12#pullrequestreview-1', user: { login: 'bot' }, submitted_at: '2026-01-01T00:00:00Z' }), { headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetch)
    const suggestion = '```suggestion\nconst retries = 3\nconst delay = 100\n```'
    await createPullRequestReviewCore({
      token: 'test',
      owner: 'vercel',
      repo: 'ai',
      pullNumber: 12,
      event: 'COMMENT',
      comments: [
        { path: 'src/retry.ts', body: suggestion, startLine: 10, line: 12, side: 'RIGHT' },
        { path: 'src/retry.ts', body: 'Typo', line: 20 },
      ],
    })
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body)).comments).toEqual([
      { path: 'src/retry.ts', body: suggestion, start_line: 10, line: 12, side: 'RIGHT' },
      { path: 'src/retry.ts', body: 'Typo', line: 20 },
    ])
  })
})
