import { connectGitHubCredentials } from '@vercel/connect/eve'
import { defaultGitHubAuth, githubChannel } from 'eve/channels/github'

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
  // eve's GitHub defaults omit input.requested (unlike Slack/Linear/Discord).
  // Without this, write-tool approval parks the turn with only the eyes reaction.
  events: {
    async 'input.requested'(data, channel) {
      for (const request of data.requests) {
        const lines = [request.prompt]
        if (request.kind === 'tool-approval' && request.action) {
          lines.push('', `Tool: \`${request.action.toolName}\``)
          // Keep the comment short — full JSON bodies get split by GitHub's
          // comment size limit and break the approval UX.
          const summary = summarizeToolInput(request.action.input)
          if (summary) lines.push(summary)
        }
        if (request.options?.length) {
          lines.push(
            '',
            `Reply with ${request.options.map(option => `\`${option.label}\``).join(' or ')} (exact word, no quote-reply).`,
          )
        }
        await channel.thread.post(lines.join('\n'))
      }
    },
  },
})

function summarizeToolInput(input: Record<string, unknown>): string | undefined {
  const parts: string[] = []
  for (const key of ['owner', 'repo', 'title', 'number', 'pullNumber', 'issueNumber'] as const) {
    const value = input[key]
    if (typeof value === 'string' || typeof value === 'number') {
      parts.push(`${key}: ${value}`)
    }
  }
  return parts.length > 0 ? parts.join(' · ') : undefined
}
