import { connectGitHubCredentials } from '@vercel/connect/eve'
import { defaultGitHubAuth, githubChannel, type GitHubInboundContext } from 'eve/channels/github'

const botName = 'github-agent'

async function canPush(ctx: GitHubInboundContext) {
  const { body } = await ctx.github.request<{ permission: string }>({
    method: 'GET',
    path: `/repos/${ctx.repository.fullName}/collaborators/${encodeURIComponent(ctx.sender.login)}/permission`,
  }).catch(() => ({ body: { permission: 'none' } }))
  return body.permission === 'admin' || body.permission === 'write'
}

export default githubChannel({
  botName,
  credentials: connectGitHubCredentials('github/github-agent'),
  // The agent acts as the GitHub App, so approval can't tell a maintainer from a stranger:
  // only people who can push may use it.
  onComment: async (ctx, comment) =>
    ctx.sender.type !== 'Bot' && comment.body.includes(`@${botName}`) && await canPush(ctx)
      ? { auth: defaultGitHubAuth(ctx) }
      : null,
})
