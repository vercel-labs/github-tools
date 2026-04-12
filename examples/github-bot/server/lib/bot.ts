import { Chat, type Message, type Thread } from 'chat'
import { createGitHubAdapter } from '@chat-adapter/github'
import { createMemoryState } from '@chat-adapter/state-memory'
import type { SerializedMessage } from 'chat'
import { resumeHook, start } from 'workflow/api'
import { reviewWorkflow } from '../workflows/review'

const adapters = { github: createGitHubAdapter() }

export interface ThreadState {
  runId?: string
}

export interface GitHubContext {
  owner: string
  repo: string
  issueNumber: number
  isPullRequest: boolean
  title: string
}

export type ChatTurnPayload = {
  message: SerializedMessage
}

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
  console.log('[bot] onNewMention:', `${ctx.owner}/${ctx.repo}#${ctx.issueNumber}`, '|', message.text)

  await thread.subscribe()
  const run = await start(reviewWorkflow, [
    JSON.stringify(thread.toJSON()),
    message.text,
    JSON.stringify(ctx),
  ])
  await thread.setState({ runId: run.runId })
})

bot.onSubscribedMessage(async (thread: Thread<ThreadState>, message: Message) => {
  console.log('[bot] onSubscribedMessage:', message.text)
  const state = await thread.state
  if (!state?.runId) return

  await resumeHook<ChatTurnPayload>(state.runId, {
    message: message.toJSON(),
  })
})
