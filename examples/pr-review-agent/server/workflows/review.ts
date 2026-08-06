import { createGithubAgent } from '@github-tools/sdk'
import { connectGithubToken } from '@github-tools/sdk/connect'
import { createHook, getWorkflowMetadata } from 'workflow'
import { createLogger } from 'evlog'
import { createAILogger, createEvlogIntegration } from 'evlog/ai'
import type { ChatTurnPayload, GitHubContext } from '../lib/agent'

const CONNECTOR = process.env.GITHUB_CONNECT_CONNECTOR || 'github/test-github-tools'

async function runAgentTurn(prompt: string, instructions: string, ctx: GitHubContext) {
  'use step'
  const log = createLogger()
  const ai = createAILogger(log, {
    toolInputs: { maxLength: 500 },
    cost: { 'claude-sonnet-4.6': { input: 3, output: 15 } },
  })

  const agent = createGithubAgent({
    model: ai.wrap('anthropic/claude-sonnet-4.6') as any,
    token: connectGithubToken(CONNECTOR, { preset: 'code-review' }),
    preset: 'code-review',
    requireApproval: false,
    context: {
      owner: ctx.owner,
      repo: ctx.repo,
      ...(ctx.isPullRequest ? { pullNumber: ctx.issueNumber } : { issueNumber: ctx.issueNumber }),
    },
    additionalInstructions: instructions,
    experimental_telemetry: {
      isEnabled: true,
      integrations: [createEvlogIntegration(ai)] as any,
    },
  })

  const { text } = await agent.generate({ prompt })
  log.emit()
  return text
}

function buildContextInstructions(ctx: GitHubContext): string {
  const target = ctx.isPullRequest
    ? `Pull Request #${ctx.issueNumber}`
    : `Issue #${ctx.issueNumber}`

  return `## Current context
- Repository: ${ctx.owner}/${ctx.repo}
- ${target}: "${ctx.title}"
- You are responding in this ${ctx.isPullRequest ? 'PR' : 'issue'} thread.

## Instructions
1. Fetch the ${ctx.isPullRequest ? 'PR details and changed files' : 'issue details'} using the appropriate tools.
2. Address the user's request thoroughly.
3. **Always post your response as a comment** on the ${ctx.isPullRequest ? 'PR' : 'issue'} using the appropriate tool (addPullRequestComment or addIssueComment).
   - If you find issues, post a detailed review with specific feedback.
   - If everything looks good, post a summary of what you reviewed and confirm the code is solid.
   - Never stay silent: the user expects a visible response on the ${ctx.isPullRequest ? 'PR' : 'issue'}.`
}

export async function reviewWorkflow(prompt: string, ctx: GitHubContext) {
  'use workflow'

  const { workflowRunId } = getWorkflowMetadata()
  const instructions = buildContextInstructions(ctx)

  using hook = createHook<ChatTurnPayload>({ token: workflowRunId })

  await runAgentTurn(prompt, instructions, ctx)

  for await (const event of hook) {
    await runAgentTurn(event.text, instructions, ctx)
  }
}
