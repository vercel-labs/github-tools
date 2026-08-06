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
    if (ctx.sender.login.toLowerCase() !== 'hugorcd') return null
    if (!mentionPattern.test(comment.body)) return null
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
          lines.push('```json', JSON.stringify(request.action.input, null, 2), '```')
        }
        if (request.options?.length) {
          lines.push(
            '',
            `Reply with ${request.options.map(option => `\`${option.label}\``).join(' or ')}.`,
          )
        }
        await channel.thread.post(lines.join('\n'))
      }
    },
  },
})
