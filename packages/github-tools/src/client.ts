import { Octokit } from 'octokit'

/** @see https://docs.github.com/en/rest/about-the-rest-api/api-versions */
export const GITHUB_API_VERSION = '2022-11-28'

export function createOctokit(token: string): Octokit {
  const octokit = new Octokit({ auth: token })
  octokit.request = octokit.request.defaults({
    headers: {
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    },
  })
  return octokit
}
