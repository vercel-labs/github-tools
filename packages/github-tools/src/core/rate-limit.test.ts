import { describe, expect, it } from 'vitest'
import {
  enrichGithubRateLimitError,
  finishGithubResult,
  parseGithubRateLimit,
  recordGithubRateLimit,
  stripRateLimit,
  withComposedRateLimit,
} from './rate-limit'

const headers = {
  'x-ratelimit-remaining': '38',
  'x-ratelimit-limit': '5000',
  'x-ratelimit-reset': '1774800000',
  'x-ratelimit-resource': 'core',
}

const rateLimit = {
  remaining: 38,
  limit: 5000,
  reset: 1774800000,
  resource: 'core',
}

describe('parseGithubRateLimit', () => {
  it('reads remaining, limit, reset, and resource', () => {
    expect(parseGithubRateLimit(headers)).toEqual(rateLimit)
  })

  it('includes retry-after when present', () => {
    expect(parseGithubRateLimit({ ...headers, 'retry-after': '12' })).toEqual({
      ...rateLimit,
      retryAfter: 12,
    })
  })

  it('returns undefined when the required headers are missing', () => {
    expect(parseGithubRateLimit({ 'content-type': 'application/json' })).toBeUndefined()
  })
})

describe('stripRateLimit', () => {
  it('drops rateLimit from a plain object', () => {
    expect(stripRateLimit({ name: 'hello-world', rateLimit })).toEqual({
      name: 'hello-world',
    })
  })

  it('leaves arrays unchanged', () => {
    const branches = [{ name: 'main' }]
    expect(stripRateLimit(branches)).toBe(branches)
  })
})

describe('finishGithubResult', () => {
  it('attaches rateLimit on plain objects', () => {
    const owner = {}
    recordGithubRateLimit(owner, headers)
    expect(finishGithubResult(owner, { name: 'hello-world' })).toEqual({
      name: 'hello-world',
      rateLimit,
    })
  })

  it('does not wrap arrays', () => {
    const owner = {}
    recordGithubRateLimit(owner, headers)
    expect(finishGithubResult(owner, [{ name: 'main' }])).toEqual([{ name: 'main' }])
  })
})

describe('enrichGithubRateLimitError', () => {
  it('appends remaining/reset on 403 errors', () => {
    const error = Object.assign(new Error('API rate limit exceeded'), { status: 403 })
    const parsed = parseGithubRateLimit({
      ...headers,
      'x-ratelimit-remaining': '0',
      'x-ratelimit-resource': 'search',
    })
    expect(() => {
      throw enrichGithubRateLimitError(error, parsed)
    }).toThrow('GitHub rate limit search: 0/5000 remaining, resets at 1774800000')
  })
})

describe('withComposedRateLimit', () => {
  it('lifts a nested rateLimit onto the composed object and strips children', () => {
    expect(withComposedRateLimit({
      pullRequest: { number: 1, rateLimit },
      files: [{ filename: 'a.ts' }],
    })).toEqual({
      pullRequest: { number: 1 },
      files: [{ filename: 'a.ts' }],
      rateLimit,
    })
  })
})
