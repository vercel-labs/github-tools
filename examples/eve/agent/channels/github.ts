import { githubChannel } from '@github-tools/eve-extension/channels'
import { connectGitHubCredentials } from '@vercel/connect/eve'

export default githubChannel({
  credentials: connectGitHubCredentials('github/github-agent'),
  respondTo: 'writers',
})
