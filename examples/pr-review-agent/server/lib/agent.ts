import { Chat, emoji, type Message, type Thread } from 'chat'
import { createGitHubAdapter } from '@chat-adapter/github'
import { createMemoryState } from '@chat-adapter/state-memory'
import { resumeHook, start } from 'workflow/api'
import { reviewWorkflow } from '../workflows/review'

export interface ThreadState { runId?: string }

export interface GitHubContext {
  owner: string
  repo: string
  issueNumber: number
  isPullRequest: boolean
}

export type ChatTurnPayload = { text: string }

const adapters = { github: createGitHubAdapter() }

export const agent = new Chat<typeof adapters, ThreadState>({
  userName: process.env.GITHUB_AGENT_USERNAME || 'pr-review-agent',
  adapters,
  state: createMemoryState(),
}).registerSingleton()

// The adapter's `raw` carries the webhook's repository and the comment, including the author's role.
type GitHubRawMessage = {
  comment: { author_association: string }
  repository: { name: string, owner: { login: string } }
  prNumber: number
  threadType?: 'issue' | 'pr'
}

// Only people with write access can drive the agent, since it acts with the App's token.
const TRUSTED_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR'])

function isTrustedAuthor(message: Message): boolean {
  const raw = message.raw as GitHubRawMessage
  return TRUSTED_ASSOCIATIONS.has(raw.comment.author_association)
}

function extractGitHubContext(message: Message): GitHubContext {
  const raw = message.raw as GitHubRawMessage
  return {
    owner: raw.repository.owner.login,
    repo: raw.repository.name,
    issueNumber: raw.prNumber,
    isPullRequest: raw.threadType !== 'issue',
  }
}

agent.onNewMention(async (thread: Thread<ThreadState>, message: Message) => {
  if (!isTrustedAuthor(message)) return
  const ctx = extractGitHubContext(message)
  const sent = thread.createSentMessageFromMessage(message)
  await sent.addReaction(emoji.eyes)

  await thread.subscribe()
  const run = await start(reviewWorkflow, [message.text, ctx])
  await thread.setState({ runId: run.runId })
})

agent.onSubscribedMessage(async (thread: Thread<ThreadState>, message: Message) => {
  if (!isTrustedAuthor(message)) return
  const state = await thread.state
  if (!state?.runId) return
  await resumeHook<ChatTurnPayload>(state.runId, { text: message.text })
})
