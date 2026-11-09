import { describe, expect, it } from 'vitest'
import { resolveInstructions, resolveToolGuidance } from './instructions'
import { PRESET_TOOLS, type GithubToolPreset } from './presets'

const presets = Object.keys(PRESET_TOOLS) as GithubToolPreset[]

describe('resolveToolGuidance', () => {
  it.each(presets)('keeps the %s tool rules without the "You are" opener', (preset) => {
    const guidance = resolveToolGuidance({ preset })
    expect(guidance).not.toMatch(/You are/)
    expect(guidance.length).toBeGreaterThan(100)
    // Everything after the opener paragraph of the full prompt is the guidance.
    expect(resolveInstructions({ preset }).endsWith(guidance)).toBe(true)
  })

  it('tells an agent without a preset to prefer the combined read tools, and adds the context', () => {
    const guidance = resolveToolGuidance({ context: { owner: 'vercel', repo: 'ai' } })
    expect(guidance).toMatch(/^Prefer getPullRequestContext/)
    expect(guidance).toContain('Working context: repository vercel/ai.')
  })
})
