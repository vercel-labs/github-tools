import { Octokit } from 'octokit'
import {
  enrichGithubRateLimitError,
  finishGithubResult,
  parseGithubRateLimit,
  recordGithubRateLimit,
} from './core/rate-limit'

/** @see https://docs.github.com/en/rest/about-the-rest-api/api-versions */
export const GITHUB_API_VERSION = '2026-03-10'

function errorResponseHeaders(error: unknown): Record<string, unknown> | undefined {
  if (error == null || typeof error !== 'object' || !('response' in error)) return undefined
  const response = (error as { response?: { headers?: Record<string, unknown> } }).response
  return response?.headers
}

export function createOctokit(token: string): Octokit {
  const octokit = new Octokit({ auth: token })

  octokit.hook.before('request', (options) => {
    options.headers = {
      ...options.headers,
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    }
  })

  octokit.hook.after('request', (response) => {
    recordGithubRateLimit(octokit, response.headers)
  })

  octokit.hook.error('request', (error) => {
    const rateLimit = parseGithubRateLimit(errorResponseHeaders(error))
    if (rateLimit) recordGithubRateLimit(octokit, errorResponseHeaders(error))
    throw enrichGithubRateLimitError(error, rateLimit)
  })

  return octokit
}

/** Run a GitHub `*Core` body and attach `rateLimit` from this Octokit instance. */
export async function withOctokit<T>(token: string, fn: (octokit: Octokit) => Promise<T>): Promise<T> {
  const octokit = createOctokit(token)
  const result = await fn(octokit)
  return finishGithubResult(octokit, result)
}
