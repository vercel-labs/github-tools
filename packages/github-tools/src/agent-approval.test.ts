import { Experimental_DecisionMockModelV4, MockLanguageModelV4 } from 'ai/test'
import { tool } from 'ai'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createGithubAgent } from './index'

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
}

function labelingModel() {
  let calls = 0
  return new MockLanguageModelV4({
    doGenerate: async () => calls++ === 0
      ? {
          content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: 'addLabels', input: JSON.stringify({ owner: 'vercel', repo: 'ai', issueNumber: 12, labels: ['bug'] }) }],
          finishReason: { unified: 'tool-calls', raw: 'tool_calls' },
          usage,
          warnings: [],
        }
      : { content: [{ type: 'text', text: 'ok' }], finishReason: { unified: 'stop', raw: 'stop' }, usage, warnings: [] },
  })
}

function decisionModel(risk: number, intent: number) {
  return new Experimental_DecisionMockModelV4({
    doDecide: async () => ({
      answers: { risk: { type: 'score' as const, score: risk }, intent: { type: 'boolean' as const, probability: intent } },
      warnings: [],
    }),
  })
}

function approvalParts(content: ReadonlyArray<{ type: string }>) {
  return content.filter(part => part.type === 'tool-approval-request' || part.type === 'tool-approval-response')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("createGithubAgent approvals", () => {
  it("puts the decision model's verdict on the approval request when 'auto' asks", async () => {
    const agent = createGithubAgent({ model: labelingModel(), token: 'test', requireApproval: 'auto', evaluation: { model: decisionModel(2, 0.9) } })
    const result = await agent.generate({ prompt: 'Label vercel/ai#12 as a bug' })
    expect(approvalParts(result.content)).toEqual([
      expect.objectContaining({ type: 'tool-approval-request', reason: 'Hard to undo (risk 2 of 2), 90% likely you asked for it.' }),
    ])
  })

  it("records the calls 'auto' lets through as automatic approvals, with the verdict", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(JSON.stringify([{ name: 'bug', color: 'd73a4a', description: null }]), { headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetch)
    const agent = createGithubAgent({ model: labelingModel(), token: 'test', requireApproval: 'auto', evaluation: { model: decisionModel(0, 0.95) } })
    const result = await agent.generate({ prompt: 'Label vercel/ai#12 as a bug' })
    expect(String(fetch.mock.calls[0]![0])).toContain('/repos/vercel/ai/issues/12/labels')
    expect(JSON.stringify(result.steps[0]!.content)).toContain('Approved automatically: negligible (risk 0 of 2), 95% likely you asked for it.')
  })

  it('labels a fractional risk score with the nearest level', async () => {
    const agent = createGithubAgent({ model: labelingModel(), token: 'test', requireApproval: 'auto', evaluation: { model: decisionModel(0.53, 0.01) } })
    const result = await agent.generate({ prompt: 'What is vercel/ai#12 about?' })
    expect(approvalParts(result.content)).toEqual([
      expect.objectContaining({ type: 'tool-approval-request', reason: 'Visible but reversible (risk 0.5 of 2), 1% likely you asked for it.' }),
    ])
  })

  it('asks without a reason when every write needs approval', async () => {
    const agent = createGithubAgent({ model: labelingModel(), token: 'test' })
    const result = await agent.generate({ prompt: 'Label vercel/ai#12 as a bug' })
    expect(approvalParts(result.content)).toEqual([expect.objectContaining({ type: 'tool-approval-request' })])
    expect(approvalParts(result.content)[0]).not.toHaveProperty('reason')
  })

  it('keeps the needsApproval of a tool prepareCall adds outside the GitHub catalog', async () => {
    let calls = 0
    const model = new MockLanguageModelV4({
      doGenerate: async () => calls++ === 0
        ? { content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: 'deploy', input: JSON.stringify({ env: 'production' }) }], finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage, warnings: [] }
        : { content: [{ type: 'text', text: 'ok' }], finishReason: { unified: 'stop', raw: 'stop' }, usage, warnings: [] },
    })
    const execute = vi.fn(async () => 'deployed')
    const deploy = tool({ inputSchema: z.object({ env: z.string() }), needsApproval: true, execute })
    const agent = createGithubAgent({ model, token: 'test', prepareCall: call => ({ ...call, tools: { ...call.tools, deploy } }) })
    const result = await agent.generate({ prompt: 'Deploy to production' })
    expect(approvalParts(result.content)).toEqual([expect.objectContaining({ type: 'tool-approval-request' })])
    expect(execute).not.toHaveBeenCalled()
  })

  it('passes a tool added outside the GitHub catalog its own context in needsApproval', async () => {
    let calls = 0
    const model = new MockLanguageModelV4({
      doGenerate: async () => calls++ === 0
        ? { content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: 'deploy', input: JSON.stringify({ env: 'production' }) }], finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage, warnings: [] }
        : { content: [{ type: 'text', text: 'ok' }], finishReason: { unified: 'stop', raw: 'stop' }, usage, warnings: [] },
    })
    const execute = vi.fn(async () => 'deployed')
    const deploy = tool({
      inputSchema: z.object({ env: z.string() }),
      contextSchema: z.object({ protectedEnv: z.string() }),
      needsApproval: (input, { context }) => input.env === context.protectedEnv,
      execute,
    })
    const agent = createGithubAgent({ model, token: 'test', prepareCall: call => ({ ...call, tools: { ...call.tools, deploy }, toolsContext: { ...call.toolsContext, deploy: { protectedEnv: 'production' } } }) })
    const result = await agent.generate({ prompt: 'Deploy to production' })
    expect(approvalParts(result.content)).toEqual([expect.objectContaining({ type: 'tool-approval-request' })])
    expect(execute).not.toHaveBeenCalled()
  })

  it('lets your own toolApproval replace the GitHub policy', async () => {
    const agent = createGithubAgent({ model: labelingModel(), token: 'test', toolApproval: () => ({ type: 'denied', reason: 'Read-only workspace' }) })
    const result = await agent.generate({ prompt: 'Label vercel/ai#12 as a bug' })
    expect(JSON.stringify(result.steps[0]!.content)).toContain('Read-only workspace')
  })
})
