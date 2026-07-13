import { describe, expect, it } from 'vitest'
import { createGithubTokenResolver, resolveGithubToken } from './token'

describe('createGithubTokenResolver', () => {
  it('normalizes a token string into an async resolver', async () => {
    const resolveToken = createGithubTokenResolver('ghp_explicit')
    await expect(resolveToken()).resolves.toBe('ghp_explicit')
  })

  it('uses an async token provider', async () => {
    const resolveToken = createGithubTokenResolver(async () => 'ghp_dynamic')
    await expect(resolveToken()).resolves.toBe('ghp_dynamic')
  })

  it('throws when an async token provider resolves empty', async () => {
    const resolveToken = createGithubTokenResolver(async () => '')
    await expect(resolveToken()).rejects.toThrow('GitHub token is required')
  })

  it('falls back to process.env.GITHUB_TOKEN', async () => {
    const previous = process.env.GITHUB_TOKEN
    process.env.GITHUB_TOKEN = 'ghp_env'
    const resolveToken = createGithubTokenResolver()
    await expect(resolveToken()).resolves.toBe('ghp_env')
    process.env.GITHUB_TOKEN = previous
  })

  it('throws immediately when no token is available', () => {
    const previous = process.env.GITHUB_TOKEN
    delete process.env.GITHUB_TOKEN
    expect(() => createGithubTokenResolver()).toThrow('GitHub token is required')
    process.env.GITHUB_TOKEN = previous
  })
})

describe('resolveGithubToken', () => {
  it('resolves a token string', async () => {
    await expect(resolveGithubToken('ghp_explicit')).resolves.toBe('ghp_explicit')
  })

  it('resolves an async token provider', async () => {
    await expect(resolveGithubToken(async () => 'ghp_dynamic')).resolves.toBe('ghp_dynamic')
  })
})
