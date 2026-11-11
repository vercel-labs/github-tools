import { defineAgent } from 'eve'
import { mockModel } from 'eve/evals'
import { audited as auditedRecords } from '../fixtures/audit'
import { githubCalls } from '../fixtures/github-calls'

const target = { owner: 'vercel-labs', repo: 'github-tools' }
const audited = { owner: 'vercel-labs', repo: 'audited' }

export default defineAgent({
  defaultTools: false,
  model: mockModel(({ messages, lastUserMessage, toolResults }) => {
    if (messages.at(-1)?.role === 'tool') {
      const last = toolResults.at(-1)!
      return `result ${last.name} ${last.isError ? 'error' : 'ok'} ${JSON.stringify(last.output)}`
    }
    // A comment from the GitHub channel arrives with its context block, and names no repository.
    if (lastUserMessage?.includes('read this repository')) return { toolCalls: [{ name: 'github__getRepository', input: {} }] }
    switch (lastUserMessage) {
      case 'resolve thread':
        return { toolCalls: [{ name: 'github__resolveReviewThread', input: { threadId: 'PRRT_1' } }] }
      case 'search':
        return { toolCalls: [{ name: 'github__searchCode', input: { query: 'secret' } }] }
      case 'read private':
        return { toolCalls: [{ name: 'github__getRepository', input: { owner: 'vercel-labs', repo: 'private' } }] }
      case 'read':
        return { toolCalls: [{ name: 'github__getRepository', input: target }] }
      case 'write':
        return { toolCalls: [{ name: 'github__createIssue', input: { ...target, title: 'eval' } }] }
      case 'comment':
        return { toolCalls: [{ name: 'github__addIssueComment', input: { ...target, issueNumber: 1, body: 'eval' } }] }
      case 'strict read':
        return { toolCalls: [{ name: 'strict__getRepository', input: target }] }
      case 'strict write':
        return { toolCalls: [{ name: 'strict__createIssue', input: { ...target, title: 'eval' } }] }
      case 'gated write':
        return { toolCalls: [{ name: 'gated__createIssue', input: { ...target, title: 'eval' } }] }
      case 'gated update':
        return { toolCalls: [{ name: 'gated__updateIssue', input: { ...target, issueNumber: 999, state: 'closed' } }] }
      case 'audited read':
        return { toolCalls: [{ name: 'audited__getRepository', input: audited }] }
      case 'audited write':
        return { toolCalls: [{ name: 'audited__createIssue', input: { ...audited, title: 'eval' } }] }
      case 'audited elsewhere':
        return { toolCalls: [{ name: 'audited__createIssue', input: { ...target, title: 'eval' } }] }
      case 'audited label':
        return { toolCalls: [{ name: 'audited__addLabels', input: { ...audited, issueNumber: 12, labels: ['bug'] } }] }
      case 'audited comment':
        return { toolCalls: [{ name: 'audited__addIssueComment', input: { ...audited, issueNumber: 1, body: 'eval' } }] }
      case 'audited comment 500':
        return { toolCalls: [{ name: 'audited__addIssueComment', input: { ...audited, issueNumber: 500, body: 'eval' } }] }
      case 'audited comment 501':
        return { toolCalls: [{ name: 'audited__addIssueComment', input: { ...audited, issueNumber: 501, body: 'eval' } }] }
      case 'audit records':
        return JSON.stringify(auditedRecords())
      case 'github calls':
        return JSON.stringify(githubCalls())
      default:
        return `unexpected message: ${lastUserMessage}`
    }
  }),
})
