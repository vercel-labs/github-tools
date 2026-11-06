import { describe, expect, it } from 'vitest'
import * as sdk from './index'
import { ALL_GITHUB_TOOL_NAMES } from './core/tool-names'

describe('index exports', () => {
  // `allTools` completeness is enforced at compile time (`satisfies AllGithubTools`);
  // the re-export lines at the bottom of index.ts are not, so guard them here.
  it('re-exports a factory for every catalog tool', () => {
    for (const name of ALL_GITHUB_TOOL_NAMES) {
      expect(typeof (sdk as Record<string, unknown>)[name], `missing factory export: ${name}`).toBe('function')
    }
  })
})

describe('agent overrides', () => {
  it('applies tool overrides in createGithubAgent and createDurableGithubAgent', async () => {
    const { createGithubAgent } = await import('./agents')
    const { createDurableGithubAgent } = await import('./workflow')
    const overrides = { listIssues: { description: 'Custom list issues' } }
    expect(createGithubAgent({ model: 'test/model', token: 'test', overrides }).tools.listIssues.description).toBe('Custom list issues')
    expect(createDurableGithubAgent({ model: 'test/model', token: 'test', overrides }).tools.listIssues.description).toBe('Custom list issues')
  })
})
