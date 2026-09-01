import { describe, expect, it } from 'vitest'
import { EvlogError, githubToolsErrors, toGithubToolsError, toModelErrorPayload } from './errors'

function requestError(status: number, message: string) {
  return Object.assign(new Error(message), {
    status,
    request: { method: 'GET', url: 'https://api.github.com/repos/o/r' },
  })
}

const rateLimit = { remaining: 0, limit: 5000, reset: 1774800000, resource: 'core' }

describe('toGithubToolsError', () => {
  it('maps 401 to UNAUTHORIZED with the original error as cause', () => {
    const original = requestError(401, 'Bad credentials')
    const mapped = toGithubToolsError(original, undefined)

    expect(EvlogError.isEvlogError(mapped)).toBe(true)
    const error = mapped as EvlogError
    expect(error.code).toBe('github_tools.UNAUTHORIZED')
    expect(error.message).toContain('Bad credentials')
    expect(error.cause).toBe(original)
    expect(error.internal).toMatchObject({ status: 401, url: 'https://api.github.com/repos/o/r' })
  })

  it('maps 404 to NOT_FOUND and names the hidden-access cause', () => {
    const mapped = toGithubToolsError(requestError(404, 'Not Found'), undefined) as EvlogError
    expect(mapped.code).toBe('github_tools.NOT_FOUND')
    expect(mapped.why).toContain('404 instead of 403')
  })

  it('maps 422 to VALIDATION_FAILED with the GitHub message embedded', () => {
    const mapped = toGithubToolsError(requestError(422, 'Reference already exists'), undefined) as EvlogError
    expect(mapped.code).toBe('github_tools.VALIDATION_FAILED')
    expect(mapped.message).toContain('Reference already exists')
  })

  it('maps an exhausted 403 to RATE_LIMITED with the reset suffix', () => {
    const mapped = toGithubToolsError(requestError(403, 'API rate limit exceeded'), rateLimit) as EvlogError
    expect(mapped.code).toBe('github_tools.RATE_LIMITED')
    expect(mapped.message).toContain('GitHub rate limit core: 0/5000 remaining, resets at 1774800000')
  })

  it('maps 429 to RATE_LIMITED even without headers', () => {
    const mapped = toGithubToolsError(requestError(429, 'Too many requests'), undefined) as EvlogError
    expect(mapped.code).toBe('github_tools.RATE_LIMITED')
  })

  it('maps a non-rate-limit 403 to FORBIDDEN', () => {
    const mapped = toGithubToolsError(
      requestError(403, 'Resource not accessible by integration'),
      { ...rateLimit, remaining: 4800 },
    ) as EvlogError
    expect(mapped.code).toBe('github_tools.FORBIDDEN')
    expect(mapped.why).toContain('installation token')
  })

  it('passes unmapped statuses through unchanged', () => {
    const original = requestError(502, 'Server error')
    expect(toGithubToolsError(original, undefined)).toBe(original)
  })

  it('passes non-error values through unchanged', () => {
    expect(toGithubToolsError('boom', undefined)).toBe('boom')
  })
})

describe('toModelErrorPayload', () => {
  it('projects code, message, why, and fix but never internal or link', () => {
    const error = githubToolsErrors.NOT_FOUND({
      detail: 'Not Found',
      internal: { status: 404 },
    })
    const payload = toModelErrorPayload(error)

    expect(payload.code).toBe('github_tools.NOT_FOUND')
    expect(payload.message).toContain('Not Found')
    expect(payload.why).toBeDefined()
    expect(payload.fix).toBeDefined()
    expect(payload).not.toHaveProperty('internal')
    expect(payload).not.toHaveProperty('link')
    expect(payload).not.toHaveProperty('status')
  })
})
