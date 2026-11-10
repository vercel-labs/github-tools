import { connectGitHubCredentials } from '@vercel/connect/eve'
import { defaultGitHubAuth, githubChannel, type GitHubInboundContext } from 'eve/channels/github'
import { call } from 'eve/events'

const botName = 'github-agent'
const mentionPattern = new RegExp(
  `@${botName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Za-z0-9_-])`,
  'iu',
)

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
  onComment: async (ctx, comment) => {
    if (ctx.sender.type === 'Bot') return null
    if (!mentionPattern.test(comment.body)) return null
    // On a public repository anyone can comment: only people who can push may use the agent.
    if (!await canPush(ctx)) return null
    return { auth: defaultGitHubAuth(ctx) }
  },
  // Replaces eve's default prompt to name the tool being approved.
  events: {
    async 'interaction.opened'(event, ctx) {
      const { request, subject } = event.data
      const lines = [request.prompt]
      const toolCall = request.kind === 'approval' && 'callId' in subject ? call(ctx.view, subject.callId) : undefined
      if (toolCall) {
        lines.push('', `Tool: \`${toolCall.name}\``)
        // Keep the comment short — full JSON bodies get split by GitHub's
        // comment size limit and break the approval UX.
        const summary = summarizeToolInput(toolCall.input)
        if (summary) lines.push(summary)
      }
      if (request.options?.length) {
        lines.push(
          '',
          `Reply with ${request.options.map(option => `\`@${botName} ${option.label}\``).join(' or ')}.`,
        )
      }
      await ctx.channel.thread.post(lines.join('\n'))
    },
  },
})

function summarizeToolInput(input: unknown): string | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const parts: string[] = []
  for (const key of ['owner', 'repo', 'title', 'number', 'pullNumber', 'issueNumber'] as const) {
    const value = (input as Record<string, unknown>)[key]
    if (typeof value === 'string' || typeof value === 'number') {
      parts.push(`${key}: ${value}`)
    }
  }
  return parts.length > 0 ? parts.join(' · ') : undefined
}
