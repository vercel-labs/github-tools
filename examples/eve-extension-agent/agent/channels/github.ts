import { connectGitHubCredentials } from '@vercel/connect/eve'
import { githubChannel } from 'eve/channels/github'

export default githubChannel({
  botName: 'test-github-tools',
  credentials: connectGitHubCredentials('github/test-github-tools'),
})
