import { connectGitHubCredentials } from '@vercel/connect/eve'
import { defaultGitHubAuth, githubChannel } from 'eve/channels/github'
import { call } from 'eve/events'

const botName = 'test-github-tools'
const mentionPattern = new RegExp(
  `@${botName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Za-z0-9_-])`,
  'iu',
)

/** Bare HITL replies — must be the whole comment (no quote-reply). */
const approvalReplyPattern = /^(yes|no|approve|deny)$/i

function isApprovalReply(body: string): boolean {
  return approvalReplyPattern.test(body.trim())
}

export default githubChannel({
  botName,
  credentials: connectGitHubCredentials('github/test-github-tools'),
  onComment: (ctx, comment) => {
    if (ctx.sender.login.toLowerCase() !== 'hugorcd') return null
    // Mentions start turns; bare Yes/No resume parked tool approvals.
    if (!mentionPattern.test(comment.body) && !isApprovalReply(comment.body)) return null
    return { auth: defaultGitHubAuth(ctx) }
  },
  // eve's default prompt asks for a mention; this one accepts the bare replies above
  // and names the tool being approved.
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
          `Reply with ${request.options.map(option => `\`${option.label}\``).join(' or ')} (exact word, no quote-reply).`,
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
