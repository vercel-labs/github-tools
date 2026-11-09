import type { ModelMessage } from 'ai'
import { Experimental_DecisionMockModelV4, MockLanguageModelV4 } from 'ai/test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGithubAgent, createGithubTools } from '../index'
import { executeGithubEveTool } from '../eve-runtime'
import * as tanstack from '../tanstack'
import type { GithubTool } from '../types'

const options = { toolCallId: 'call-1', messages: [] as ModelMessage[] }
const execute = (tool: GithubTool, input: Record<string, unknown>) => (tool.execute as (input: unknown, options: { toolCallId: string, messages: ModelMessage[] }) => Promise<unknown>)(input, options)

function stubGithub() {
  const requests: string[] = []
  vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>(async (input, init) => {
    requests.push(`${init?.method ?? 'GET'} ${new URL(String(input)).pathname}`)
    return new Response(JSON.stringify({ name: 'ai', full_name: 'vercel/ai', default_branch: 'main' }), { headers: { 'content-type': 'application/json' } })
  }))
  return requests
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('dryRun', () => {
  const issue = { owner: 'vercel', repo: 'ai', title: 'Flaky test' }

  it('answers writes without calling GitHub or asking anyone, and runs reads as usual', async () => {
    const requests = stubGithub()
    const tools = createGithubTools({ token: 'test', dryRun: true })
    expect(tools.createIssue.needsApproval).toBe(false)
    await expect(execute(tools.createIssue, issue)).resolves.toEqual({
      dryRun: true,
      tool: 'createIssue',
      input: expect.objectContaining(issue),
      approval: { required: true },
      message: 'Dry run: `createIssue` was not sent to GitHub, so nothing changed. For real, it would have asked for approval. Tell the user what this call would have done.',
    })
    await expect(execute(createGithubTools({ token: 'test', dryRun: true, requireApproval: false }).createIssue, issue)).resolves.toMatchObject({ approval: { required: false } })
    await execute(tools.getRepository, { owner: 'vercel', repo: 'ai' })
    expect(requests).toEqual(['GET /repos/vercel/ai'])
  })

  it('fills context and still applies guardrails', async () => {
    stubGithub()
    const tools = createGithubTools({ token: 'test', dryRun: true, context: { owner: 'vercel', repo: 'ai' }, guardrails: { branches: ['agent/*'] } })
    await expect(execute(tools.createIssue, { title: 'x' })).resolves.toMatchObject({ input: { owner: 'vercel', repo: 'ai', title: 'x' } })
    await expect(execute(tools.createBranch, { branch: 'main' })).rejects.toThrow('Blocked by guardrails')
  })

  it('applies to TanStack tools and the eve runtime', async () => {
    const requests = stubGithub()
    const tool = tanstack.createIssue('test', { dryRun: true })
    expect(tool.needsApproval).toBe(false)
    await expect(tool.execute!(issue)).resolves.toMatchObject({ dryRun: true, tool: 'createIssue', approval: { required: true } })
    await expect(executeGithubEveTool('createIssue', issue, { token: 'test', dryRun: true, dryRunApproval: { required: false, reason: 'Approved automatically' } }))
      .resolves.toMatchObject({ dryRun: true, tool: 'createIssue', approval: { required: false, reason: 'Approved automatically' } })
    expect(requests).toEqual([])
  })

  it("reports the evaluation model's verdict on createGithubAgent with 'auto', without asking", async () => {
    const requests = stubGithub()
    const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } }
    let calls = 0
    const model = new MockLanguageModelV4({
      doGenerate: async () => calls++ === 0
        ? { content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: 'addLabels', input: JSON.stringify({ owner: 'vercel', repo: 'ai', issueNumber: 12, labels: ['bug'] }) }], finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage, warnings: [] }
        : { content: [{ type: 'text', text: 'ok' }], finishReason: { unified: 'stop', raw: 'stop' }, usage, warnings: [] },
    })
    const decisionModel = new Experimental_DecisionMockModelV4({
      doDecide: async () => ({ answers: { risk: { type: 'score' as const, score: 2 }, intent: { type: 'boolean' as const, probability: 0.9 } }, warnings: [] }),
    })
    const agent = createGithubAgent({ model, token: 'test', requireApproval: 'auto', evaluation: { model: decisionModel }, dryRun: true })
    const result = await agent.generate({ prompt: 'Label vercel/ai#12 as a bug' })
    expect(result.steps[0]!.content.some(part => part.type === 'tool-approval-request')).toBe(false)
    expect(result.steps[0]!.content).toContainEqual(expect.objectContaining({
      type: 'tool-result',
      output: expect.objectContaining({ approval: { required: true, reason: 'Hard to undo (risk 2 of 2), 90% likely you asked for it.' } }),
    }))
    expect(requests).toEqual([])
  })
})
