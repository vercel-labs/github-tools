import { describe, expect, it } from 'vitest'
import { GITHUB_API_VERSION, createOctokit } from './client'
import { finishGithubResult, peekGithubRateLimit } from './core/rate-limit'

describe('createOctokit', () => {
  it('sets X-GitHub-Api-Version on REST requests', async () => {
    const seen: string[] = []
    const octokit = createOctokit('ghp_test')

    octokit.request = octokit.request.defaults({
      request: {
        fetch: async (_url: string, init?: RequestInit) => {
          const headers = init?.headers as Record<string, string> | undefined
          seen.push(String(headers?.['X-GitHub-Api-Version'] ?? headers?.['x-github-api-version']))
          return new Response(JSON.stringify({ message: 'Bad credentials' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          })
        },
      },
    })

    await octokit.rest.issues.create({
      owner: 'octocat',
      repo: 'hello-world',
      title: 'test',
    }).catch(() => {})

    expect(seen.at(-1)).toBe(GITHUB_API_VERSION)
  })

  it('records rate-limit headers on a successful request', async () => {
    const octokit = createOctokit('ghp_test')
    octokit.request = octokit.request.defaults({
      request: {
        fetch: async () => new Response(JSON.stringify({
          resources: { core: { limit: 5000, remaining: 38, reset: 1774800000, used: 0 } },
          rate: { limit: 5000, remaining: 38, reset: 1774800000, used: 0 },
        }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'x-ratelimit-limit': '5000',
            'x-ratelimit-remaining': '38',
            'x-ratelimit-reset': '1774800000',
            'x-ratelimit-resource': 'core',
          },
        }),
      },
    })

    await octokit.rest.rateLimit.get()

    expect(peekGithubRateLimit(octokit)).toEqual({
      remaining: 38,
      limit: 5000,
      reset: 1774800000,
      resource: 'core',
    })
    expect(finishGithubResult(octokit, { ok: true })).toEqual({
      ok: true,
      rateLimit: {
        remaining: 38,
        limit: 5000,
        reset: 1774800000,
        resource: 'core',
      },
    })
  })

  it('appends rate-limit state on a 403', async () => {
    const octokit = createOctokit('ghp_test')
    octokit.request = octokit.request.defaults({
      request: {
        fetch: async () => new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
          status: 403,
          headers: {
            'content-type': 'application/json',
            'x-ratelimit-limit': '30',
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '1774800000',
            'x-ratelimit-resource': 'search',
          },
        }),
      },
    })

    await expect(octokit.rest.search.code({ q: 'test' })).rejects.toThrow(
      'GitHub rate limit search: 0/30 remaining, resets at 1774800000',
    )
  })
})
