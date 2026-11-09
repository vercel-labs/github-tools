import { WorkflowAgent } from '@ai-sdk/workflow'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

  it('explains the required @ai-sdk/workflow version when WorkflowAgent has no generate()', () => {
    const agent = createDurableGithubAgent({ model: 'test/model', token: 'test' })
    // As on @ai-sdk/workflow before 2.0.59.
    Object.assign(Reflect.get(agent, 'agent'), { generate: undefined })
    expect(() => agent.generate({ prompt: 'hi' }))
      .toThrow(expect.objectContaining({ code: 'github_tools.DURABLE_GENERATE_UNAVAILABLE' }))
  })
})
