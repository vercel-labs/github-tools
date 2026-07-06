import { describe, expect, it } from 'vitest'
import { GITHUB_API_VERSION, createOctokit } from './client'

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
})
