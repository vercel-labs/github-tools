import { inspect } from 'node:util'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GithubToolName } from './registry'
import { githubToolsErrors } from '../core/errors'
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

describe('runGithubToolStep beforeWrite', () => {
  const issue = { owner: 'o', repo: 'r', title: 'x' }

  function stubGithub() {
    const requests: string[] = []
    vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>(async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input))
      requests.push(`${init?.method ?? (input instanceof Request ? input.method : 'GET')} ${url.pathname}`)
      return new Response(JSON.stringify({ number: 1, title: 'x', html_url: 'https://github.com/o/r/issues/1', state: 'open', labels: [], name: 'r', full_name: 'o/r' }), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    return requests
  }

  it('awaits it with the resolved call before a write\'s request', async () => {
    const requests = stubGithub()
    const seen: unknown[] = []
    await runGithubToolStep('createIssue', { title: 'x' }, {
      token: 'ghp_x',
      context: { owner: 'o', repo: 'r' },
      beforeWrite: async (call) => {
        await Promise.resolve()
        seen.push({ call, requests: [...requests] })
      },
    })
    expect(seen).toEqual([{ call: { toolName: 'createIssue', input: issue, owner: 'o', repo: 'r' }, requests: [] }])
    expect(requests).toEqual(['POST /repos/o/r/issues'])
  })

  it('sends nothing when it throws, and fails the call with what it threw', async () => {
    const requests = stubGithub()
    const error = await runGithubToolStep('createIssue', issue, {
      token: 'ghp_x',
      beforeWrite: () => {
        throw githubToolsErrors.AUDIT_UNAVAILABLE()
      },
    }).catch((thrown: unknown) => thrown) as Error
    expect(JSON.parse(error.message)).toMatchObject({ code: 'github_tools.AUDIT_UNAVAILABLE', fix: expect.stringContaining('Do not retry') })
    expect(error.cause).toEqual({ code: 'github_tools.AUDIT_UNAVAILABLE', status: 503 })
    expect(requests).toEqual([])
  })

  it('is not called for a read, a dry-run write, or a write guardrails block', async () => {
    stubGithub()
    const beforeWrite = vi.fn()
    await runGithubToolStep('getRepository', { owner: 'o', repo: 'r' }, { token: 'ghp_x', beforeWrite })
    await runGithubToolStep('createIssue', issue, { token: 'ghp_x', dryRun: true, beforeWrite })
    await runGithubToolStep('createIssue', issue, { token: 'ghp_x', guardrails: { repositories: ['o/other'] }, beforeWrite }).catch(() => undefined)
    expect(beforeWrite).not.toHaveBeenCalled()
  })
})
