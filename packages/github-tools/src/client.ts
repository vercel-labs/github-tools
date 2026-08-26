import { Octokit } from 'octokit'

/** @see https://docs.github.com/en/rest/about-the-rest-api/api-versions */
export const GITHUB_API_VERSION = '2026-03-10'

export function createOctokit(token: string): Octokit {
  const octokit = new Octokit({ auth: token })

  octokit.hook.before('request', (options) => {
    options.headers = {
      ...options.headers,
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    }
  })

  return octokit
}
