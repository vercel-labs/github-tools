import { describe, expect, it } from 'vitest'
import { PRESET_TOOLS, type GithubToolPreset } from './presets'
import { resolveInstructions } from './instructions'
import { PRESET_CONNECT_SCOPES, TOOL_CONNECT_SCOPES } from '../connect/scopes'

const presets = Object.keys(PRESET_TOOLS) as GithubToolPreset[]

describe('PRESET_TOOLS', () => {
  it('lets every preset read files, history and code', () => {
    for (const preset of presets) {
      expect(PRESET_TOOLS[preset], preset).toEqual(expect.arrayContaining(['getRepository', 'getFileContent', 'getRepositoryTree', 'searchCode', 'listCommits']))
    }
  })

  it('has every tool a preset prompt names', () => {
    for (const preset of presets) {
      if (preset === 'maintainer') continue
      const prompt = resolveInstructions({ preset })
      for (const name of PRESET_TOOLS.maintainer) {
        if (new RegExp(`\\b${name}\\b`).test(prompt)) expect(PRESET_TOOLS[preset], `${preset} prompt names ${name}`).toContain(name)
      }
    }
  })

  it('derives each preset\'s Connect scopes from its tools', () => {
    for (const preset of presets) {
      const scopes = new Set(PRESET_TOOLS[preset].flatMap(name => TOOL_CONNECT_SCOPES[name]))
      expect(new Set(PRESET_CONNECT_SCOPES[preset]), preset).toEqual(new Set(['metadata:read', ...scopes]))
    }
  })
})

describe('resolveInstructions', () => {
  it('combines the guidance of several presets and keeps the shared rules once', () => {
    const prompt = resolveInstructions({ preset: ['code-review', 'ci-ops'] })
    expect(prompt).toContain('You are a code review assistant.')
    expect(prompt).toContain('You are a CI/CD operations assistant.')
    expect(prompt.match(/When a tool execution is denied by the user/g)).toHaveLength(1)
    expect(resolveInstructions({ preset: ['ci-ops'] })).toBe(resolveInstructions({ preset: 'ci-ops' }))
  })
})
