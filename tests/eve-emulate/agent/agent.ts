import { defineAgent } from 'eve'
import { mockModel } from 'eve/evals'

// A fixed model: each message names the tool call to make, and the reply after a tool result
// carries that result, so an eval can read what the emulator answered.
export default defineAgent({
  defaultTools: false,
  model: mockModel(({ messages, lastUserMessage, toolResults }) => {
    if (messages.at(-1)?.role === 'tool') {
      const last = toolResults.at(-1)!
      return `result ${last.name} ${last.isError ? 'error' : 'ok'} ${JSON.stringify(last.output)}`
    }
    const message = lastUserMessage ?? ''
    // A comment from the GitHub channel arrives with its context block, and names no repository.
    if (message.includes('read this repository')) return { toolCalls: [{ name: 'github__getRepository', input: {} }] }
    // The channel's context names the issue the comment is on.
    if (message.includes('label this issue')) return { toolCalls: [{ name: 'github__addLabels', input: { labels: ['bug'] } }] }
    const read = /^read ([\w-]+)\/([\w-]+)$/u.exec(message)
    if (read) return { toolCalls: [{ name: 'github__getRepository', input: { owner: read[1], repo: read[2] } }] }
    const label = /^label ([\w-]+)\/([\w-]+)#(\d+)$/u.exec(message)
    if (label) return { toolCalls: [{ name: 'github__addLabels', input: { owner: label[1], repo: label[2], issueNumber: Number(label[3]), labels: ['bug'] } }] }
    return `unexpected message: ${message}`
  }),
})
