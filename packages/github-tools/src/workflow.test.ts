import { WorkflowAgent } from '@ai-sdk/workflow'
import { Output } from 'ai'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { z } from 'zod'
import { createDurableGithubAgent } from './workflow'

describe('createDurableGithubAgent().generate()', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('runs the durable WorkflowAgent loop with the call options it gets', async () => {
    const generate = vi.spyOn(WorkflowAgent.prototype, 'generate').mockResolvedValue({ text: 'Reviewed.' } as never)
    const messages = [{ role: 'user' as const, content: 'Review vercel/ai#12' }]
    const result = await createDurableGithubAgent({ model: 'test/model', token: 'test', preset: 'code-review' }).generate({ messages })
    expect(generate).toHaveBeenCalledWith({ messages })
    expect(result.text).toBe('Reviewed.')
  })

  it('types result.output from the output specification, and as text without one', async () => {
    vi.spyOn(WorkflowAgent.prototype, 'generate').mockResolvedValue({ output: { title: 'Fix retries' } } as never)
    const agent = createDurableGithubAgent({ model: 'test/model', token: 'test' })
    const structured = await agent.generate({ prompt: 'Name the PR', output: Output.object({ schema: z.object({ title: z.string() }) }) })
    expectTypeOf(structured.output).toEqualTypeOf<{ title: string }>()
    expect(structured.output).toEqual({ title: 'Fix retries' })
    const text = await agent.generate({ prompt: 'Review it' })
    expectTypeOf(text.output).toEqualTypeOf<string>()
  })

  it('explains the required @ai-sdk/workflow version when WorkflowAgent has no generate()', () => {
    const agent = createDurableGithubAgent({ model: 'test/model', token: 'test' })
    // As on @ai-sdk/workflow before 2.0.59.
    Object.assign(Reflect.get(agent, 'agent'), { generate: undefined })
    expect(() => agent.generate({ prompt: 'hi' }))
      .toThrow(expect.objectContaining({ code: 'github_tools.DURABLE_GENERATE_UNAVAILABLE' }))
  })
})
