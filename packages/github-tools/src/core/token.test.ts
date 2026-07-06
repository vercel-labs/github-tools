import { describe, expect, it } from 'vitest'
import { resolveGithubToken } from './token'

describe('resolveGithubToken', () => {
  it('uses the provided token', () => {
    expect(resolveGithubToken('ghp_explicit')).toBe('ghp_explicit')
  })

  it('falls back to process.env.GITHUB_TOKEN', () => {
    const previous = process.env.GITHUB_TOKEN
    process.env.GITHUB_TOKEN = 'ghp_env'
    expect(resolveGithubToken()).toBe('ghp_env')
    process.env.GITHUB_TOKEN = previous
  })

  it('throws when no token is available', () => {
    const previous = process.env.GITHUB_TOKEN
    delete process.env.GITHUB_TOKEN
    expect(() => resolveGithubToken()).toThrow('GitHub token is required')
    process.env.GITHUB_TOKEN = previous
  })
})
