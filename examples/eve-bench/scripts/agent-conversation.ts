import type { ModelMessage } from 'ai'
import { createGithubAgent } from '@github-tools/sdk'
import { benchEvaluator } from '../lib/evaluator.ts'
import { logLine } from '../lib/log.ts'
import { stubGithubWrites } from '../lib/stub-writes.ts'
import { TASKS } from '../evals/data/tasks.ts'

// The same six requests as `evals/conversation.eval.ts`, sent to `createGithubAgent` instead of
// eve, to measure how each AI SDK configuration keeps the prompt cache across requests.
const TURNS = ['explore', 'review-read', 'label', 'ci-diagnose', 'release-notes', 'notifications']
const CONFIGS = {
  'all': {},
  'presets': { preset: 'auto', evaluation: { selection: 'presets' } },
  'tools': { preset: 'auto', evaluation: {} },
} as const
// Claude Opus 5.5 per million tokens: input, cache read, cache write, output.
const PRICE = { input: 4, cacheRead: 0.2, cacheWrite: 5, output: 20 }

const config = (process.env.BENCH_CONFIG ?? 'all') as keyof typeof CONFIGS
if (!(config in CONFIGS)) throw new Error(`Unknown BENCH_CONFIG "${config}" for the AI SDK bench`)
const run = new Date().toISOString()
stubGithubWrites({ bench: 'agent-conversation', config, run })

const { preset, evaluation } = CONFIGS[config] as { preset?: 'auto', evaluation?: Record<string, unknown> }
const agent = createGithubAgent({
  model: 'anthropic/claude-opus-5.5',
  token: process.env.GITHUB_TOKEN!,
  preset,
  evaluation: { ...evaluation, model: benchEvaluator({ config: `agent-${config}`, level: 'default' }) },
  requireApproval: false,
  providerOptions: { gateway: { caching: 'auto' } },
})

const messages: ModelMessage[] = []
const totals = { cost: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, steps: 0, ms: 0 }
for (const id of TURNS) {
  messages.push({ role: 'user', content: TASKS.find(task => task.id === id)!.prompt })
  const started = performance.now()
  const result = await agent.generate({ messages })
  const ms = performance.now() - started
  messages.push(...result.responseMessages)
  const steps = result.steps.map((step) => {
    const { cacheReadTokens: cacheRead = 0, cacheWriteTokens: cacheWrite = 0, noCacheTokens: noCache = 0 } = step.usage.inputTokenDetails
    const output = step.usage.outputTokens ?? 0
    const cost = (noCache * PRICE.input + cacheRead * PRICE.cacheRead + cacheWrite * PRICE.cacheWrite + output * PRICE.output) / 1e6
    return { cacheRead, cacheWrite, input: noCache + cacheRead + cacheWrite, output, cost, tools: step.toolCalls.map(call => call.toolName) }
  })
  for (const step of steps) {
    totals.cost += step.cost
    totals.input += step.input
    totals.cacheRead += step.cacheRead
    totals.cacheWrite += step.cacheWrite
    totals.output += step.output
  }
  totals.steps += steps.length
  totals.ms += ms
  logLine('agent-conversation.jsonl', { run, config, turn: id, ms: Math.round(ms), steps })
  console.log(`${id.padEnd(14)} ${steps.length} steps, first step ${(steps[0]!.cacheRead / 1e3).toFixed(1)}k read / ${(steps[0]!.cacheWrite / 1e3).toFixed(1)}k write, $${steps.reduce((sum, step) => sum + step.cost, 0).toFixed(3)}, tools: ${steps.flatMap(step => step.tools).join(' ')}`)
}
console.log(JSON.stringify({ config, ...totals, cacheReadShare: totals.cacheRead / totals.input, cost: Number(totals.cost.toFixed(3)), ms: Math.round(totals.ms) }))
