import { expect, it, vi } from 'vitest'
import { createGithubTools } from './tools'
import { needsAutoApproval } from './evaluation'
import { evaluator } from './test-helpers'

const gateway = vi.hoisted(() => ({ loads: 0, decider: vi.fn() }))
vi.mock('@tanstack/ai-vercel-gateway', () => {
  gateway.loads++
  return { vercelGatewayDecider: gateway.decider }
})

it('loads Gateway only for default automatic evaluation', async () => {
  createGithubTools({ token: 'test', requireApproval: false })
  expect(gateway.loads).toBe(0)
  const { adapter } = evaluator()
  expect(await needsAutoApproval('addLabels', {}, [], { adapter })).toBe(false)
  expect(gateway.loads).toBe(0)
  gateway.decider.mockReturnValue(adapter)
  expect(await needsAutoApproval('addLabels', {}, [])).toBe(false)
  expect(gateway.loads).toBe(1)
  expect(gateway.decider).toHaveBeenCalledWith('typesafe-ai/jev')
})
