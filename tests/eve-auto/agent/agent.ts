import { defineAgent } from 'eve'
import { mockModel } from 'eve/evals'
import { recorded } from '../fixtures/record'

const issue = { owner: 'vercel-labs', repo: 'github-tools', issueNumber: 12 }

export default defineAgent({
  defaultTools: false,
  model: mockModel(({ messages, lastUserMessage, toolResults }) => {
    if (messages.at(-1)?.role === 'tool') {
      const last = toolResults.at(-1)!
      return `result ${last.name} ${last.isError ? 'error' : 'ok'} ${JSON.stringify(last.output)}`
    }
    switch (lastUserMessage) {
      case 'read':
        return { toolCalls: [{ name: 'github__getRepository', input: { owner: issue.owner, repo: issue.repo } }] }
      case 'label bug':
        return { toolCalls: [{ name: 'github__addLabels', input: { ...issue, labels: ['bug'] } }] }
      case 'label wontfix':
        return { toolCalls: [{ name: 'github__addLabels', input: { ...issue, labels: ['wontfix'] } }] }
      case 'recorded':
        return JSON.stringify(recorded())
      default:
        return `unexpected message: ${lastUserMessage}`
    }
  }),
})
