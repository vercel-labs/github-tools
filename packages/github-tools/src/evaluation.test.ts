import type { ModelMessage } from 'ai'
import { Experimental_EvaluationMockModelV4, MockLanguageModelV4 } from 'ai/test'
import type { Experimental_EvaluationModelV4CallOptions, LanguageModelV4CallOptions } from '@ai-sdk/provider'
import { describe, expect, it, vi } from 'vitest'
import { createGithubAgent, createGithubTools, AUTO_APPROVAL_TOOLS, PRESET_TOOLS } from './index'
import { resolveApprovalMode } from './core/approval'
import { resolveInstructions } from './agents'

function evaluationModel(answer: (options: Experimental_EvaluationModelV4CallOptions) => Record<string, number>) {
  const calls: Experimental_EvaluationModelV4CallOptions[] = []
  const model = new Experimental_EvaluationMockModelV4({
    doEvaluate: async (options) => {
      calls.push(options)
      const values = answer(options)
      return {
        answers: Object.fromEntries(Object.entries(options.questions).map(([id, question]) => [
          id,
          question.type === 'score'
            ? { type: 'score' as const, score: values[id] ?? 0 }
            : { type: 'boolean' as const, probability: values[id] ?? 0 },
        ])),
        warnings: [],
      }
    },
  })
  return { model, calls }
}

const messages: ModelMessage[] = [
  { role: 'user', content: 'Label issue 12 as a bug' },
  { role: 'assistant', content: 'Reading the issue.' },
  { role: 'user', content: [{ type: 'text', text: 'Add the bug label to vercel/ai#12' }] },
]

type NeedsApproval = (input: unknown, options: { toolCallId: string, messages: ModelMessage[] }) => Promise<boolean>

describe("requireApproval: 'auto'", () => {
  it('evaluates low-risk write tools and keeps approval on the rest', () => {
    for (const name of AUTO_APPROVAL_TOOLS) expect(resolveApprovalMode(name, 'auto')).toBe('auto')
    expect(resolveApprovalMode('mergePullRequest', 'auto')).toBe(true)
    expect(resolveApprovalMode('mergePullRequest', { mergePullRequest: 'auto' })).toBe('auto')
    expect(resolveApprovalMode('addLabels', { mergePullRequest: 'auto' })).toBe(true)

    const tools = createGithubTools({ token: 'test', requireApproval: 'auto' })
    expect(typeof tools.addLabels.needsApproval).toBe('function')
    expect(tools.mergePullRequest.needsApproval).toBe(true)
    expect(tools.getIssue.needsApproval).toBeUndefined()
  })

  it('skips approval for a low-risk call the user asked for', async () => {
    const { model, calls } = evaluationModel(() => ({ risk: 0.2, intent: 0.95 }))
    const tools = createGithubTools({ token: 'test', requireApproval: 'auto', evaluation: { model } })
    const input = { owner: 'vercel', repo: 'ai', issueNumber: 12, labels: ['bug'] }

    await expect((tools.addLabels.needsApproval as NeedsApproval)(input, { toolCallId: '1', messages })).resolves.toBe(false)
    expect(calls[0]!.state).toMatchObject({
      request: 'Add the bug label to vercel/ai#12',
      toolCall: { tool: 'addLabels', input },
    })
  })

  it('asks when risk or intent misses its threshold', async () => {
    const needsApproval = (risk: number, intent: number, thresholds = {}) => {
      const { model } = evaluationModel(() => ({ risk, intent }))
      const tools = createGithubTools({ token: 'test', requireApproval: 'auto', evaluation: { model, ...thresholds } })
      return (tools.addIssueComment.needsApproval as NeedsApproval)({}, { toolCallId: '1', messages })
    }
    await expect(needsApproval(1, 0.6)).resolves.toBe(false)
    await expect(needsApproval(1.5, 0.99)).resolves.toBe(true)
    await expect(needsApproval(0, 0.5)).resolves.toBe(true)
    await expect(needsApproval(1.5, 0.5, { maxRisk: 1.5, minIntent: 0.5 })).resolves.toBe(false)
  })

  it('asks and logs EVALUATION_FAILED when the evaluation model fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { model } = evaluationModel(() => {
      throw new Error('Model not enabled for this project')
    })
    const tools = createGithubTools({ token: 'test', requireApproval: 'auto', evaluation: { model } })

    await expect((tools.addLabels.needsApproval as NeedsApproval)({}, { toolCallId: '1', messages })).resolves.toBe(true)
    expect(warn).toHaveBeenCalledWith('[github-tools]', expect.objectContaining({
      code: 'github_tools.EVALUATION_FAILED',
      message: expect.stringContaining('asking approval for addLabels: Model not enabled for this project'),
    }))
    warn.mockRestore()
  })
})

describe("createGithubAgent({ preset: 'auto' })", () => {
  async function run(probabilities: Record<string, number> | Error, prompt = 'Why is CI red on main?', options = {}) {
    const evaluation = evaluationModel(() => {
      if (probabilities instanceof Error) throw probabilities
      return probabilities
    })
    const calls: LanguageModelV4CallOptions[] = []
    const agent = createGithubAgent({
      model: new MockLanguageModelV4({
        doGenerate: async (options) => {
          calls.push(options)
          return {
            content: [{ type: 'text', text: 'ok' }],
            finishReason: { unified: 'stop', raw: 'stop' },
            usage: {
              inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: 1, text: 1, reasoning: 0 },
            },
            warnings: [],
          }
        },
      }),
      token: 'test',
      preset: 'auto',
      evaluation: { model: evaluation.model, ...options },
    })
    await agent.generate({ prompt })
    const system = calls[0]!.prompt.find(message => message.role === 'system')
    return {
      questions: Object.keys(evaluation.calls[0]!.questions),
      request: evaluation.calls[0]!.state,
      tools: (calls[0]!.tools ?? []).map(tool => tool.name),
      system: system?.content,
    }
  }

  it('asks one question per preset except maintainer', async () => {
    const { questions, request } = await run({})
    expect(questions).toContain('ci-ops')
    expect(questions).not.toContain('maintainer')
    expect(request).toEqual({ request: 'Why is CI red on main?' })
  })

  it('exposes only the selected preset and its system prompt', async () => {
    const { tools, system } = await run({ 'ci-ops': 0.9, 'code-review': 0.3 })
    expect(new Set(tools)).toEqual(new Set(PRESET_TOOLS['ci-ops']))
    expect(system).toBe(resolveInstructions({ preset: 'ci-ops' }))
  })

  it('merges several selected presets', async () => {
    const { tools } = await run({ 'ci-ops': 0.9, 'code-review': 0.8 })
    expect(new Set(tools)).toEqual(new Set([...PRESET_TOOLS['ci-ops'], ...PRESET_TOOLS['code-review']]))
  })

  it('selects repo-explorer only when no other preset qualifies', async () => {
    const withTask = await run({ 'repo-explorer': 0.95, 'issue-triage': 0.8 })
    expect(new Set(withTask.tools)).toEqual(new Set(PRESET_TOOLS['issue-triage']))
    const alone = await run({ 'repo-explorer': 0.95, 'issue-triage': 0.4 })
    expect(new Set(alone.tools)).toEqual(new Set(PRESET_TOOLS['repo-explorer']))
  })

  it('keeps only the most likely presets up to maxPresets', async () => {
    const probabilities = { 'code-review': 0.75, 'ci-ops': 0.9, 'issue-triage': 0.8 }
    const { tools } = await run(probabilities)
    expect(new Set(tools)).toEqual(new Set([...PRESET_TOOLS['ci-ops'], ...PRESET_TOOLS['issue-triage']]))
    const single = await run(probabilities, undefined, { maxPresets: 1 })
    expect(new Set(single.tools)).toEqual(new Set(PRESET_TOOLS['ci-ops']))
  })

  it('falls back to the most likely preset when none clears the threshold', async () => {
    const { tools, system } = await run({ 'ci-ops': 0.3, 'code-review': 0.1 })
    expect(new Set(tools)).toEqual(new Set(PRESET_TOOLS['ci-ops']))
    expect(system).toBe(resolveInstructions({ preset: 'ci-ops' }))
  })

  it('falls back to read-only repo-explorer when nothing stands out', async () => {
    const { tools } = await run({}, 'hello')
    expect(new Set(tools)).toEqual(new Set(PRESET_TOOLS['repo-explorer']))
  })

  it('uses repo-explorer and logs EVALUATION_FAILED when the evaluation model fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { tools, system } = await run(new Error('Insufficient credits'))
    expect(new Set(tools)).toEqual(new Set(PRESET_TOOLS['repo-explorer']))
    expect(system).toBe(resolveInstructions({ preset: 'repo-explorer' }))
    expect(warn).toHaveBeenCalledWith('[github-tools]', expect.objectContaining({
      code: 'github_tools.EVALUATION_FAILED',
      message: expect.stringContaining('using the repo-explorer preset: Insufficient credits'),
    }))
    warn.mockRestore()
  })
})
