import { Message, type Thread } from 'chat'
import { createHook, getWorkflowMetadata } from 'workflow'
import { generateText, type ToolSet } from 'ai'
import { createGithubTools } from '@github-tools/sdk'
import { createLogger } from 'evlog'
import { createAILogger, createEvlogIntegration } from 'evlog/ai'
import type { ChatTurnPayload, GitHubContext, ThreadState } from '../lib/bot'

const SYSTEM_PROMPT = `You are a code review assistant operating inside a GitHub issue or pull request thread.
You reply directly in the conversation — keep responses concise and actionable.

When reviewing a PR:
- Use getPullRequest to get the PR description and metadata
- Use listPullRequestFiles to see which files changed
- Use getFileContent to read the actual code when needed
- Use getBlame to trace why a specific line exists
- Check for bugs, logic errors, edge cases, and security issues
- Be constructive — explain why something is a problem and how to fix it
- Use createPullRequestReview to submit a formal review with inline comments

When working on an issue:
- Use getIssue to read the full issue details
- Help with analysis, investigation, or answering questions

When a tool execution is denied by the user, do not retry it. Briefly acknowledge the decision and move on.`

async function postMessage(threadJson: string, text: string) {
  'use step'
  const { bot } = await import('../lib/bot')
  await bot.initialize()
  const thread = JSON.parse(threadJson, bot.reviver()) as Thread<ThreadState>
  await thread.post(text)
}

async function runAgentTurn(prompt: string, system: string) {
  'use step'

  const log = createLogger()
  const ai = createAILogger(log, {
    toolCalls: true,
    toolInputs: { maxLength: 500 },
    toolResults: { maxLength: 300 },
    cost: {
      'claude-sonnet-4.6': { input: 3, output: 15 },
    },
  })

  const result = await generateText({
    model: ai.wrap('anthropic/claude-sonnet-4.6'),
    tools: createGithubTools({ preset: 'code-review' }) as ToolSet,
    system,
    prompt,
    experimental_telemetry: {
      isEnabled: true,
      integrations: [createEvlogIntegration(ai)],
    },
  })

  log.emit()
  return result.text
}

function buildSystemPrompt(ctx: GitHubContext): string {
  const target = ctx.isPullRequest
    ? `Pull Request #${ctx.issueNumber}`
    : `Issue #${ctx.issueNumber}`

  return `${SYSTEM_PROMPT}

## Current context
- Repository: ${ctx.owner}/${ctx.repo}
- ${target}: "${ctx.title}"
- You are responding in this ${ctx.isPullRequest ? 'PR' : 'issue'} thread.

Start by fetching the ${ctx.isPullRequest ? 'PR details and changed files' : 'issue details'} using the appropriate tools, then address the user's request.`
}

export async function reviewWorkflow(threadJson: string, firstMessageText: string, contextJson: string) {
  'use workflow'

  const ctx: GitHubContext = JSON.parse(contextJson)
  const system = buildSystemPrompt(ctx)
  const { workflowRunId } = getWorkflowMetadata()

  console.log('[workflow] Starting review for', `${ctx.owner}/${ctx.repo}#${ctx.issueNumber}`)

  using hook = createHook<ChatTurnPayload>({ token: workflowRunId })

  await postMessage(threadJson, 'Analyzing with GitHub tools...')

  const review = await runAgentTurn(firstMessageText, system)
  await postMessage(threadJson, review)

  for await (const event of hook) {
    const nextMessage = Message.fromJSON(event.message)
    const reply = await runAgentTurn(nextMessage.text, system)
    await postMessage(threadJson, reply)
  }
}
