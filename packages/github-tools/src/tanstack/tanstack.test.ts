import { approvalCases, presetCases } from '../core/evaluation-fixtures'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { chat, genericInterruptContinuationFromDescriptor, wrapGenericInterruptContinuation, readInterruptBinding } from '@tanstack/ai'
import type { ChatMiddleware, ModelMessage } from '@tanstack/ai'
import * as github from './index'
import { autoTools } from './tools'
import { githubToolApproval } from './interrupts'
import { needsAutoApproval, selectPresets } from './evaluation'
import { ALL_GITHUB_TOOL_NAMES } from '../core/catalog'
import { PRESET_TOOLS } from '../core/presets'
import * as issues from '../core/issues'
import * as repository from '../core/repository'
import { collect, evaluator, TestTextAdapter, toolCall } from './test-helpers'

afterEach(() => vi.restoreAllMocks())
const request: ModelMessage[] = [{ role: 'user', content: 'Add bug to issue 12 on vercel/ai' }]

function execution(adapter = new TestTextAdapter(messages => messages.some(message => message.role === 'tool') ? [] : [toolCall()]), evaluate = evaluator()) {
  const write = vi.spyOn(issues, 'addLabelsCore').mockResolvedValue([{ name: 'bug', color: 'red', description: null }])
  const tools = github.createGithubTools({ token: 'test', preset: 'issue-triage', requireApproval: 'auto' })
  const approval = github.createGithubApprovalMiddleware({ tools, evaluation: { adapter: evaluate.adapter } })
  return { write, tools, approval, adapter, evaluate, run: (messages = request, extra = {}) => collect(chat({
    adapter, tools, messages, middleware: [approval], interrupts: [githubToolApproval], ...extra,
  })) }
}

describe('TanStack tools', () => {
  it('covers the catalog and standalone factories', () => {
    const tools = github.createGithubTools({ token: 'test' })
    expect(tools.map(tool => tool.name)).toEqual(ALL_GITHUB_TOOL_NAMES)
    for (const name of ALL_GITHUB_TOOL_NAMES) expect(github[name]('test').name).toBe(name)
    const preset = github.createGithubTools({ token: 'test', preset: 'repo-explorer' })
    expect(new Set(preset.map(tool => tool.name))).toEqual(new Set(PRESET_TOOLS['repo-explorer']))
    expectTypeOf(preset[0].name).toEqualTypeOf<(typeof PRESET_TOOLS)['repo-explorer'][number]>()
  })

  it('combines presets without duplicate names', () => {
    const tools = github.createGithubTools({ token: 'test', preset: ['repo-explorer', 'ci-ops'] })
    expect(new Set(tools.map(tool => tool.name))).toEqual(new Set([...PRESET_TOOLS['repo-explorer'], ...PRESET_TOOLS['ci-ops']]))
    expect(new Set(tools.map(tool => tool.name)).size).toBe(tools.length)
  })

  it('applies context before resolving token metadata and preserves pagination', async () => {
    const core = vi.spyOn(repository, 'listBranchesCore').mockResolvedValue({ items: [], hasMore: true, page: 1, perPage: 30, nextPage: 2 })
    const provider = vi.fn(async () => 'token')
    const tool = github.listBranches(provider, { context: { owner: 'vercel', repo: 'ai' } })
    const result = await tool.execute({ owner: 'override', repo: 'ai' })
    expect(result).toEqual({ items: [], hasMore: true, page: 1, perPage: 30, nextPage: 2 })
    expect(provider).toHaveBeenCalledWith(expect.objectContaining({ toolName: 'listBranches', owner: 'override', repo: 'ai' }))
    expect(core).toHaveBeenCalledWith(expect.objectContaining({ token: 'token', owner: 'override' }))
  })

  it('preserves attribution, resolves tokens per call, and strips rate-limit metadata', async () => {
    const result = { path: 'README.md', sha: 'abc', commitSha: 'def', commitUrl: 'https://example.com' }
    const core = vi.spyOn(repository, 'createOrUpdateFileCore').mockResolvedValue({ ...result, rateLimit: { remaining: 10, limit: 60, reset: 1 } } as typeof result)
    const token = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')
    const author = { name: 'Author', email: 'author@example.com' }
    const tool = github.createOrUpdateFile(token, { author, committer: author, coAuthors: [author] })
    const input = { owner: 'vercel', repo: 'ai', path: 'README.md', message: 'update', content: 'hello' }
    expect(await tool.execute(input)).toEqual(result)
    await tool.execute(input)
    expect(core).toHaveBeenLastCalledWith(expect.objectContaining({ token: 'second', author, committer: author, coAuthors: [author] }))
  })

  it('fills omitted context fields in the native loop', async () => {
    const core = vi.spyOn(repository, 'listBranchesCore').mockResolvedValue({ items: [], hasMore: false, page: 1, perPage: 30 })
    const adapter = new TestTextAdapter(messages => messages.some(message => message.role === 'tool') ? [] : [toolCall('listBranches', {})])
    const agent = github.createGithubAgent({ token: 'test', adapter, preset: 'repo-explorer', context: { owner: 'vercel', repo: 'ai' } })
    await agent.generate({ prompt: 'List branches' })
    expect(core).toHaveBeenCalledWith(expect.objectContaining({ owner: 'vercel', repo: 'ai' }))
  })

  it('retains approval when middleware is missing', async () => {
    const setup = execution()
    const chunks = await collect(chat({ adapter: setup.adapter, tools: setup.tools, messages: request }))
    expect(setup.write).not.toHaveBeenCalled()
    expect(chunks.some(chunk => chunk.type === 'RUN_FINISHED' && chunk.outcome?.type === 'interrupt')).toBe(true)
  })

  it('uses granular approval overrides without evaluating reads', () => {
    const tools = github.createGithubTools({ token: 'test', requireApproval: { mergePullRequest: 'auto' }, overrides: { addLabels: { needsApproval: false, description: 'Label an issue.' } } })
    expect(autoTools.has(tools.find(tool => tool.name === 'mergePullRequest')!)).toBe(true)
    expect(tools.find(tool => tool.name === 'addLabels')).toMatchObject({ needsApproval: false, description: 'Label an issue.' })
    expect(tools.find(tool => tool.name === 'getIssue')?.needsApproval).toBe(false)
    expect(tools.find(tool => tool.name === 'createIssue')?.needsApproval).toBe(true)
  })
})


describe('TanStack evaluation', () => {
  it.each(approvalCases)('applies shared approval policy $risk/$intent', async ({ risk, intent, options, expected }) => {
    const { adapter, calls } = evaluator(() => ({ risk, intent }))
    expect(await needsAutoApproval('addLabels', { labels: ['bug'] }, request, { adapter, ...options })).toBe(expected)
    expect(calls[0].state).toMatchObject({ request: request[0].content })
  })

  it.each(presetCases)('applies shared routing policy $expected', async ({ probabilities, options, expected }) => {
    expect(await selectPresets(request, { adapter: evaluator(() => probabilities).adapter, ...options })).toEqual(expected)
  })

  it('matches preset ranking and falls back to read-only on ties', async () => {
    expect(await selectPresets(request, { adapter: evaluator(() => ({})).adapter })).toEqual(['repo-explorer'])
    const adapter = evaluator(() => ({ 'ci-ops': 0.8, 'code-review': 0.9, 'repo-explorer': 0.99 })).adapter
    expect(await selectPresets(request, { adapter })).toEqual(['code-review', 'ci-ops'])
    expect(await selectPresets(request, { adapter, maxPresets: 1 })).toEqual(['code-review'])
  })

  it('logs failures and requests approval or uses repo-explorer', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const adapter = evaluator(() => new Error('evaluation offline')).adapter
    expect(await needsAutoApproval('addLabels', {}, request, { adapter })).toBe(true)
    expect(await selectPresets(request, { adapter })).toEqual(['repo-explorer'])
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('propagates cancellation during evaluation without logging a fallback', async () => {
    const controller = new AbortController()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const adapter = evaluator(() => { controller.abort(); return { risk: 0, intent: 1 } }).adapter
    await expect(needsAutoApproval('addLabels', {}, request, { adapter }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(warn).not.toHaveBeenCalled()
  })

  it('propagates cancellation', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(selectPresets(request, {}, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('TanStack agent and middleware', () => {
  it('executes an intended low-risk write through the real loop', async () => {
    const setup = execution()
    const chunks = await setup.run()
    expect(setup.write).toHaveBeenCalledTimes(1)
    expect(setup.evaluate.calls).toHaveLength(1)
    expect(chunks.some(chunk => chunk.type === 'TEXT_MESSAGE_CONTENT' && chunk.delta === 'Done.')).toBe(true)
    expect(setup.tools.find(tool => tool.name === 'addLabels')?.needsApproval).toBe(true)
  })

  it('pauses before side effects when Jev requires review', async () => {
    const setup = execution(undefined, evaluator(() => ({ risk: 2, intent: 0 })))
    const chunks = await setup.run()
    expect(setup.write).not.toHaveBeenCalled()
    expect(chunks.findLast(chunk => chunk.type === 'RUN_FINISHED')).toMatchObject({ outcome: { type: 'interrupt' } })
  })

  it.each([true, false])('resumes a reviewed write with approved=%s', async (approved) => {
    const setup = execution(undefined, evaluator(() => ({ risk: 2, intent: 0 })))
    const chunks = await setup.run()
    const terminal = chunks.findLast(chunk => chunk.type === 'RUN_FINISHED')!
    if (terminal.outcome?.type !== 'interrupt') throw new Error('Expected approval interrupt')
    const interrupt = terminal.outcome.interrupts[0]
    const continuation = genericInterruptContinuationFromDescriptor(interrupt)!
    const parentRunId = readInterruptBinding(interrupt)!.interruptedRunId
    const messages: ModelMessage[] = [...request, { role: 'assistant', content: '', toolCalls: [toolCall()] }]
    const resumed = await setup.run(messages, {
      parentRunId,
      resume: [{ interruptId: interrupt.id, status: 'resolved', payload: { approved }, metadata: wrapGenericInterruptContinuation(continuation) }],
    })
    expect(resumed.filter(chunk => chunk.type === 'RUN_ERROR')).toEqual([])
    expect(setup.write).toHaveBeenCalledTimes(approved ? 1 : 0)
    expect(setup.evaluate.calls).toHaveLength(1)
    expect(resumed.some(chunk => chunk.type === 'TEXT_MESSAGE_CONTENT' && chunk.delta === 'Done.')).toBe(true)
  })

  it('requires fresh review when a resumed call changes its target', async () => {
    const setup = execution(undefined, evaluator(() => ({ risk: 2, intent: 0 })))
    const chunks = await setup.run()
    const terminal = chunks.findLast(chunk => chunk.type === 'RUN_FINISHED')!
    if (terminal.outcome?.type !== 'interrupt') throw new Error('Expected approval interrupt')
    const interrupt = terminal.outcome.interrupts[0]
    const resumed = await setup.run([...request, { role: 'assistant', content: '', toolCalls: [toolCall('addLabels', { owner: 'other', repo: 'ai', issueNumber: 12, labels: ['bug'] })] }], {
      parentRunId: readInterruptBinding(interrupt)!.interruptedRunId,
      resume: [{ interruptId: interrupt.id, status: 'resolved', payload: { approved: true }, metadata: wrapGenericInterruptContinuation(genericInterruptContinuationFromDescriptor(interrupt)!) }],
    })
    expect(setup.write).not.toHaveBeenCalled()
    expect(setup.evaluate.calls).toHaveLength(2)
    expect(resumed.findLast(chunk => chunk.type === 'RUN_FINISHED')).toMatchObject({ outcome: { type: 'interrupt' } })
  })

  it('isolates concurrent approval decisions on shared tools and middleware', async () => {
    const setup = execution(undefined, evaluator(state => ({ risk: 'request' in state && state.request === 'Allow' ? 0 : 2, intent: 1 })))
    const [allowed, reviewed] = await Promise.all([setup.run([{ role: 'user', content: 'Allow' }]), setup.run([{ role: 'user', content: 'Review' }])])
    expect(setup.write).toHaveBeenCalledTimes(1)
    expect(allowed.findLast(chunk => chunk.type === 'RUN_FINISHED')).not.toMatchObject({ outcome: { type: 'interrupt' } })
    expect(reviewed.findLast(chunk => chunk.type === 'RUN_FINISHED')).toMatchObject({ outcome: { type: 'interrupt' } })
  })

  it('resumes mixed automatic, approved, and denied calls independently', async () => {
    const calls = [toolCall('addLabels', { owner: 'vercel', repo: 'ai', issueNumber: 12, labels: ['bug'] }, 'automatic'), toolCall('addLabels', { owner: 'vercel', repo: 'ai', issueNumber: 13, labels: ['bug'] }, 'approved'), toolCall('addLabels', { owner: 'vercel', repo: 'ai', issueNumber: 14, labels: ['bug'] }, 'denied')]
    const adapter = new TestTextAdapter(messages => messages.some(message => message.role === 'tool') ? [] : calls)
    const setup = execution(adapter, evaluator(state => ({ risk: JSON.stringify(state).includes('"issueNumber":12') ? 0 : 2, intent: 1 })))
    const chunks = await setup.run()
    expect(setup.write).not.toHaveBeenCalled()
    const terminal = chunks.findLast(chunk => chunk.type === 'RUN_FINISHED')!
    if (terminal.outcome?.type !== 'interrupt') throw new Error('Expected approval interrupt')
    expect(terminal.outcome.interrupts).toHaveLength(2)
    const resumed = await setup.run([...request, { role: 'assistant', content: '', toolCalls: calls }], {
      parentRunId: readInterruptBinding(terminal.outcome.interrupts[0])!.interruptedRunId,
      resume: terminal.outcome.interrupts.map((interrupt, index) => ({ interruptId: interrupt.id, status: 'resolved', payload: { approved: index === 0 }, metadata: wrapGenericInterruptContinuation(genericInterruptContinuationFromDescriptor(interrupt)!) })),
    })
    expect(resumed.filter(chunk => chunk.type === 'RUN_ERROR')).toEqual([])
    expect(setup.write.mock.calls.map(([input]) => input.issueNumber).sort()).toEqual([12, 13])
    expect(JSON.stringify(adapter.calls.at(-1)?.messages)).toContain('User denied this GitHub tool call.')
  })

  it('prevents later middleware from changing approved arguments', async () => {
    const setup = execution()
    const change: ChatMiddleware = { name: 'change', onBeforeToolCall: () => ({ type: 'transformArgs', args: { owner: 'attacker', repo: 'ai', issueNumber: 12, labels: ['bug'] } }) }
    await collect(chat({ adapter: setup.adapter, tools: setup.tools, messages: request, middleware: [setup.approval, change], interrupts: [githubToolApproval] }))
    expect(setup.write).not.toHaveBeenCalled()
  })

  it('reports missing approval separately from an explicit denial', async () => {
    const setup = execution()
    const approval: typeof setup.approval = {
      ...setup.approval,
      onBeforeToolCall(ctx, call) {
        return setup.approval.onBeforeToolCall!(ctx, { ...call, toolCallId: 'unrecorded' })
      },
    }
    await collect(chat({ adapter: setup.adapter, tools: setup.tools, messages: request, middleware: [approval], interrupts: [githubToolApproval] }))
    expect(setup.write).not.toHaveBeenCalled()
    expect(JSON.stringify(setup.adapter.calls.at(-1)?.messages)).toContain('No approval recorded for this GitHub tool call and input.')
    expect(JSON.stringify(setup.adapter.calls.at(-1)?.messages)).not.toContain('User denied')
  })

  it('supports native generation and streaming with preset instructions', async () => {
    const adapter = new TestTextAdapter()
    const agent = github.createGithubAgent({ token: 'test', adapter, preset: 'repo-explorer', context: { owner: 'vercel', repo: 'ai' }, additionalInstructions: 'Cite files.' })
    expect(await agent.generate({ prompt: 'Explain this repository', modelOptions: { temperature: 0.2 } })).toBe('Done.')
    const chunks = await collect(agent.stream({ messages: request }))
    expect(chunks.some(chunk => chunk.type === 'TEXT_MESSAGE_CONTENT')).toBe(true)
    expect(adapter.calls[0].systemPrompts?.join('\n')).toContain('Cite files.')
    expect(adapter.calls[0].systemPrompts?.join('\n')).toContain('vercel/ai')
    expect(adapter.calls[0].modelOptions).toEqual({ temperature: 0.2 })
  })

  it('passes approval continuation through the prebuilt agent', async () => {
    const setup = execution(undefined, evaluator(() => ({ risk: 2, intent: 0 })))
    const agent = github.createGithubAgent({ token: 'test', adapter: setup.adapter, preset: 'issue-triage', requireApproval: 'auto', evaluation: { adapter: setup.evaluate.adapter } })
    const chunks = await collect(agent.stream({ messages: request, threadId: 'github-thread', runId: 'github-first' }))
    const terminal = chunks.findLast(chunk => chunk.type === 'RUN_FINISHED')!
    if (terminal.outcome?.type !== 'interrupt') throw new Error('Expected approval interrupt')
    const interrupt = terminal.outcome.interrupts[0]
    const resumed = await collect(agent.stream({
      messages: [...request, { role: 'assistant', content: '', toolCalls: [toolCall()] }],
      threadId: 'github-thread', runId: 'github-second', parentRunId: readInterruptBinding(interrupt)!.interruptedRunId,
      resume: [{ interruptId: interrupt.id, status: 'resolved', payload: { approved: true }, metadata: wrapGenericInterruptContinuation(genericInterruptContinuationFromDescriptor(interrupt)!) }],
    }))
    expect(resumed.filter(chunk => chunk.type === 'RUN_ERROR')).toEqual([])
    expect(setup.write).toHaveBeenCalledTimes(1)
    expect(setup.evaluate.calls).toHaveLength(1)
  })

  it('resumes auto routing without another routing evaluation or losing the approved tool', async () => {
    let routes = 0
    const setup = execution(undefined, evaluator((state): Record<string, number> => {
      if ('toolCall' in state) return { risk: 2, intent: 0 }
      return ++routes === 1 ? { 'issue-triage': 1 } : { 'repo-explorer': 1 }
    }))
    const agent = github.createGithubAgent({ token: 'test', adapter: setup.adapter, preset: 'auto', requireApproval: 'auto', evaluation: { adapter: setup.evaluate.adapter } })
    const chunks = await collect(agent.stream({ messages: request }))
    const terminal = chunks.findLast(chunk => chunk.type === 'RUN_FINISHED')!
    if (terminal.outcome?.type !== 'interrupt') throw new Error('Expected approval interrupt')
    const interrupt = terminal.outcome.interrupts[0]
    const resumed = await collect(agent.stream({
      messages: [...request, { role: 'assistant', content: '', toolCalls: [toolCall()] }],
      parentRunId: readInterruptBinding(interrupt)!.interruptedRunId,
      resume: [{ interruptId: interrupt.id, status: 'resolved', payload: { approved: true }, metadata: wrapGenericInterruptContinuation(genericInterruptContinuationFromDescriptor(interrupt)!) }],
    }))
    expect(resumed.filter(chunk => chunk.type === 'RUN_ERROR')).toEqual([])
    expect(setup.write).toHaveBeenCalledTimes(1)
    expect(routes).toBe(1)
    expect(setup.evaluate.calls).toHaveLength(2)
    expect(new Set(setup.adapter.calls.at(-1)?.tools?.map(tool => tool.name))).toEqual(new Set([...PRESET_TOOLS['repo-explorer'], 'addLabels']))
  })

  it.each([true, 'auto'] as const)('rejects generate when approval policy %s interrupts the run', async requireApproval => {
    const setup = execution(undefined, evaluator(() => ({ risk: 2, intent: 0 })))
    const agent = github.createGithubAgent({ token: 'test', adapter: setup.adapter, preset: 'issue-triage', requireApproval, evaluation: { adapter: setup.evaluate.adapter } })
    await expect(agent.generate({ messages: request })).rejects.toThrow('Use stream() to handle approval interrupts and continuation.')
    expect(setup.write).not.toHaveBeenCalled()
  })

  it('routes per invocation without sharing concurrent state', async () => {
    const adapter = new TestTextAdapter()
    const evaluation = evaluator(state => ({ 'ci-ops': 'request' in state && state.request === 'CI' ? 0.9 : 0, 'code-review': 'request' in state && state.request === 'Review' ? 0.9 : 0 }))
    const agent = github.createGithubAgent({ token: 'test', adapter, preset: 'auto', evaluation: { adapter: evaluation.adapter } })
    expect(await Promise.all([agent.generate({ prompt: 'CI' }), agent.generate({ prompt: 'Review' })])).toEqual(['Done.', 'Done.'])
    expect(evaluation.calls).toHaveLength(2)
    expect(adapter.calls.map(call => call.tools?.map(tool => tool.name))).toEqual(expect.arrayContaining([
      expect.arrayContaining(['getCiFailureContext']), expect.arrayContaining(['createPullRequestReview']),
    ]))
  })
})
