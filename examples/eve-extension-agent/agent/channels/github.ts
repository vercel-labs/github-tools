import { connectGitHubCredentials } from '@vercel/connect/eve'
import { defaultGitHubAuth, githubChannel } from 'eve/channels/github'

const botName = 'test-github-tools'
const mentionPattern = new RegExp(
  `@${botName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Za-z0-9_-])`,
  'iu',
)

export default githubChannel({
  botName,
  credentials: connectGitHubCredentials('github/test-github-tools'),
  onComment: (ctx, comment) => {
    if (!mentionPattern.test(comment.body)) return null
    return { auth: defaultGitHubAuth(ctx) }
  },
})
