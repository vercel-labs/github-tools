import { inspect } from 'node:util'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GithubToolName } from './registry'
import { runGithubToolStep } from './steps'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('runGithubToolStep failures', () => {
  it('throws a catalog error with its { code, message, why, fix, link } as the message', async () => {
    const error = await runGithubToolStep('getRepository', { owner: 'o', repo: 'r' }, {
      token: async () => '',
    }).catch((thrown: unknown) => thrown) as Error

    expect(JSON.parse(error.message)).toEqual({
      code: 'github_tools.TOKEN_REQUIRED',
      message: expect.stringContaining('GitHub token is required'),
      why: expect.any(String),
      fix: expect.any(String),
      link: 'https://github-tools.com/auth',
    })
    expect(error.cause).toEqual({ code: 'github_tools.TOKEN_REQUIRED', status: 401 })
  })

  it('rethrows other errors unchanged', async () => {
    await expect(runGithubToolStep('nonexistentTool' as GithubToolName, {}, { token: 'ghp_x' }))
      .rejects.toThrow(new Error('Unknown GitHub tool: nonexistentTool'))
  })

  // eve logs a failed call with the thrown error and its cause chain.
  it.each([
    { status: 422, name: 'Error', cause: { code: 'github_tools.VALIDATION_FAILED', status: 422 } },
    { status: 400, name: 'HttpError', cause: undefined },
  ])('throws nothing from the request of a write GitHub answers with $status', async ({ status, name, cause }) => {
    vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>(async () => new Response(
      JSON.stringify({ message: 'Refused' }),
      { status, headers: { 'content-type': 'application/json' } },
    )))

    const error = await runGithubToolStep('createIssue', { owner: 'o', repo: 'r', title: 'x', body: 'a body only the request holds' }, { token: 'ghp_x' })
      .catch((thrown: unknown) => thrown) as Error
    const logged = inspect(error, { depth: null, showHidden: true })

    expect(error.name).toBe(name)
    expect(error.message).toContain('Refused')
    expect(error.cause).toEqual(cause)
    expect(logged).not.toContain('a body only the request holds')
    expect(logged).not.toContain('repos/o/r/issues')
    expect(logged).not.toContain('authorization')
  })

  it('throws the message of a tool result that reports an error', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>(async () => new Response(
      JSON.stringify({ data: { resolveReviewThread: { thread: null } } }),
      { headers: { 'content-type': 'application/json' } },
    )))

    await expect(runGithubToolStep('resolveReviewThread', { threadId: 'PRRT_1' }, { token: 'ghp_x' }))
      .rejects.toThrow(new Error('Review thread not found: PRRT_1'))
  })
})
