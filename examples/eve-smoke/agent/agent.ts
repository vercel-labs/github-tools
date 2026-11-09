import { defineAgent } from 'eve'
import { mockModel } from 'eve/evals'
import { routingCalls } from '../fixtures/routing'

const target = { owner: 'vercel-labs', repo: 'github-tools' }

export default defineAgent({
  defaultTools: false,
  model: mockModel(({ messages, lastUserMessage, tools, toolResults }) => {
    if (messages.at(-1)?.role === 'tool') {
      const last = toolResults.at(-1)!
      return `result ${last.name} ${last.isError ? 'error' : 'ok'} ${JSON.stringify(last.output)}`
    }
    switch (lastUserMessage) {
      case 'tools':
        return JSON.stringify(tools.filter(tool => tool.name.startsWith('github__')).map(tool => [tool.name, tool.description]))
      case 'read':
        return { toolCalls: [{ name: 'github__getRepository', input: target }] }
      case 'write':
        return { toolCalls: [{ name: 'github__createIssue', input: { ...target, title: 'smoke' } }] }
      case 'failing write':
        return { toolCalls: [{ name: 'github__createIssue', input: { owner: 'vercel-labs', repo: 'missing', title: 'smoke' } }] }
      case 'outside write':
        return { toolCalls: [{ name: 'github__createIssue', input: { owner: 'vercel', repo: 'next.js', title: 'smoke' } }] }
      case 'dry-run write':
        return { toolCalls: [{ name: 'dryrun__createIssue', input: { ...target, title: 'smoke' } }] }
      case 'thread read':
        return { toolCalls: [{ name: 'github__getRepository', input: {} }] }
      case 'deferred read':
        return { toolCalls: [{ name: 'eve__tool', input: { name: 'github__listBranches', input: target } }] }
      case 'instructions':
        return messages.filter(message => message.role === 'system').map(message => message.text).join('\n')
      case 'routing':
        return String(routingCalls())
      default:
        return `unexpected message: ${lastUserMessage}`
    }
  }),
})
