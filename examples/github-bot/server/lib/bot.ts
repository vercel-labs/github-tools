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
  title: string
}

export type ChatTurnPayload = { text: string }

const adapters = { github: createGitHubAdapter() }

export const bot = new Chat<typeof adapters, ThreadState>({
  userName: process.env.GITHUB_BOT_USERNAME || 'github-bot',
  adapters,
  state: createMemoryState(),
}).registerSingleton()

function extractGitHubContext(message: Message): GitHubContext {
  const raw = message.raw as Record<string, any>
  return {
    owner: raw.repository?.owner?.login ?? 'unknown',
    repo: raw.repository?.name ?? 'unknown',
    issueNumber: raw.issue?.number ?? 0,
    isPullRequest: !!raw.issue?.pull_request,
    title: raw.issue?.title ?? '',
  }
}

bot.onNewMention(async (thread: Thread<ThreadState>, message: Message) => {
  const ctx = extractGitHubContext(message)
  const sent = thread.createSentMessageFromMessage(message)
  await sent.addReaction(emoji.eyes)

  await thread.subscribe()
  const run = await start(reviewWorkflow, [message.text, ctx])
  await thread.setState({ runId: run.runId })
})

bot.onSubscribedMessage(async (thread: Thread<ThreadState>, message: Message) => {
  const state = await thread.state
  if (!state?.runId) return
  await resumeHook<ChatTurnPayload>(state.runId, { text: message.text })
})
