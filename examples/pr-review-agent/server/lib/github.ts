import { createOctokit, resolveGithubToken } from '@github-tools/sdk'
import { connectGithubToken } from '@github-tools/sdk/connect'

const CONNECTOR = process.env.GITHUB_CONNECT_CONNECTOR || 'github/test-github-tools'

// The token only covers the repository the webhook came from, whatever repository the model targets.
export function repositoryToken(owner: string, repo: string) {
  return connectGithubToken(CONNECTOR, { preset: 'code-review', params: { repositories: [`${owner}/${repo}`] } })
}

// The agent acts with the App's token, so only people who can write to the repository may drive it.
export async function canWrite(owner: string, repo: string, username: string): Promise<boolean> {
  const octokit = createOctokit(await resolveGithubToken(repositoryToken(owner, repo)))
  const { data } = await octokit.rest.repos.getCollaboratorPermissionLevel({ owner, repo, username })
  return data.permission === 'admin' || data.permission === 'write'
}
