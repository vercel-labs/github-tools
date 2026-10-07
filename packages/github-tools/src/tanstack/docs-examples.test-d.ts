import { chat, chatParamsFromRequestBody, toServerSentEventsResponse } from '@tanstack/ai'
import { vercelGatewayText, vercelGatewayDecider } from '@tanstack/ai-vercel-gateway'
import { createGithubAgent } from './agent'
import { createGithubTools } from './tools'
import { createGithubApprovalMiddleware } from './approval'
import { githubToolApproval } from './interrupts'
import { getRepository, addIssueComment } from './factories'

export async function agentExample() {
  const agent = createGithubAgent({
    adapter: vercelGatewayText('anthropic/claude-opus-5'),
    preset: 'repo-explorer',
    context: { owner: 'vercel', repo: 'ai' },
  })
  const text: string = await agent.generate({ prompt: 'Summarize the open pull requests.' })
  const response: Response = toServerSentEventsResponse(agent.stream({
    prompt: 'Summarize the open pull requests.',
  }))
  return { text, response }
}

export function directToolsExample() {
  const tools = createGithubTools({
    preset: ['repo-explorer', 'code-review'],
    context: { owner: 'vercel', repo: 'ai' },
  })
  return chat({
    adapter: vercelGatewayText('anthropic/claude-opus-5'),
    tools,
    messages: [{ role: 'user', content: 'Review pull request #42.' }],
  })
}

export function individualToolsExample() {
  return [
    getRepository('example-token'),
    addIssueComment('example-token', { needsApproval: true }),
  ]
}

export function autoAgentExample() {
  return createGithubAgent({
    adapter: vercelGatewayText('anthropic/claude-opus-5'),
    context: { owner: 'vercel', repo: 'ai' },
    preset: 'auto',
    requireApproval: 'auto',
    evaluation: {
      adapter: vercelGatewayDecider('typesafe-ai/jev'),
      maxRisk: 1,
      minIntent: 0.6,
      minPresetProbability: 0.7,
      maxPresets: 2,
    },
  })
}

export function autoToolsExample() {
  const tools = createGithubTools({
    preset: 'issue-triage',
    requireApproval: 'auto',
    context: { owner: 'vercel', repo: 'ai' },
  })
  return chat({
    adapter: vercelGatewayText('anthropic/claude-opus-5'),
    tools,
    middleware: [createGithubApprovalMiddleware({ tools })],
    interrupts: [githubToolApproval],
    messages: [{ role: 'user', content: 'Add the bug label to issue #42.' }],
  })
}

export function continuationExample(input: Parameters<ReturnType<typeof autoAgentExample>['stream']>[0]) {
  return autoAgentExample().stream(input)
}

export async function POST(request: Request) {
  const agent = autoAgentExample()
  const { messages, threadId, runId, parentRunId, resume } =
    await chatParamsFromRequestBody(await request.json())
  return toServerSentEventsResponse(agent.stream({ messages, threadId, runId, parentRunId, resume }))
}

export function rejectedOverrides() {
  createGithubTools({ overrides: { getRepository: {
    // @ts-expect-error Execution is owned by the integration.
    execute: async () => ({}),
  } } })
  createGithubTools({ overrides: { getRepository: {
    // @ts-expect-error Schemas are owned by the catalog.
    inputSchema: {},
  } } })
}
