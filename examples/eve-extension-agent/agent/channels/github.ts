import { connectGitHubCredentials } from '@vercel/connect/eve'
import { githubChannel } from 'eve/channels/github'

/**
 * Inbound GitHub surface (@mentions, PR/issue comments). Separate from the
 * extension under `agent/extensions/github.ts`, which registers API tools.
 *
 * Point the Connect trigger at `/eve/v1/github` (see README). `botName` must
 * match the GitHub App slug people @mention.
 */
export default githubChannel({
  botName: 'test-github-tools',
  credentials: connectGitHubCredentials('github/test-github-tools'),
})
