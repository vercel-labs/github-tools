import { describe, expect, it } from 'vitest'
import { GITHUB_API_VERSION, createOctokit } from './client'

describe('createOctokit', () => {
  it('sets X-GitHub-Api-Version on REST requests', () => {
    const octokit = createOctokit('ghp_test')
    const { headers } = octokit.request.endpoint('GET /zen')
    expect(headers['x-github-api-version']).toBe(GITHUB_API_VERSION)
  })
})
