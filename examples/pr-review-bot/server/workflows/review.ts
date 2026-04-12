import { createHook, getWorkflowMetadata } from 'workflow'
import { createGithubAgent } from '@github-tools/sdk'
import { createLogger } from 'evlog'
import { createAILogger, createEvlogIntegration } from 'evlog/ai'
import type { ChatTurnPayload, GitHubContext } from '../lib/bot'

async function runAgentTurn(prompt: string, instructions: string) {
  'use step'
  const log = createLogger()
  const ai = createAILogger(log, {
    toolInputs: { maxLength: 500 },
    cost: { 'claude-sonnet-4.6': { input: 3, output: 15 } },
  })

  const agent = createGithubAgent({
    model: ai.wrap('anthropic/claude-sonnet-4.6') as any,
    preset: 'code-review',
    requireApproval: false,
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
   - Never stay silent — the user expects a visible response on the ${ctx.isPullRequest ? 'PR' : 'issue'}.`
}

export async function reviewWorkflow(prompt: string, ctx: GitHubContext) {
  'use workflow'

  const { workflowRunId } = getWorkflowMetadata()
  const instructions = buildContextInstructions(ctx)

  using hook = createHook<ChatTurnPayload>({ token: workflowRunId })

  await runAgentTurn(prompt, instructions)

  for await (const event of hook) {
    await runAgentTurn(event.text, instructions)
  }
}
