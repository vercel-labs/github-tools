import { connectGitHubCredentials } from '@vercel/connect/eve'
import { githubChannel } from '@github-tools/eve-extension/channels'
import { underEmulation } from '@github-tools/eve-extension/testing/agent'

// The channel as a deployed agent mounts it: the token and the bot name come from Vercel Connect.
export default githubChannel({
  credentials: underEmulation(connectGitHubCredentials('github/eval')),
  respondTo: 'writers',
})
