import { defineAgent } from 'eve'
import { mockModel } from 'eve/evals'

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
      default:
        return `unexpected message: ${lastUserMessage}`
    }
  }),
})
