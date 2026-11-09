import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ALL_GITHUB_TOOL_NAMES } from './core/tool-names'
import { isGithubWriteToolName } from './core/write-tools'

const catalogPage = readFileSync(new URL('../../../apps/docs/content/docs/7.reference/2.tools.md', import.meta.url), 'utf8')

// Rows look like "| `toolName` | Yes | Description |", with an empty second cell for read tools.
const rows = [...catalogPage.matchAll(/^\| `(\w+)` \|([^|]*)\|/gm)].map(([, name, write]) => ({ name: name!, write: write!.trim() !== '' }))

describe('tool catalog page', () => {
  it('lists every tool once, with its write flag', () => {
    const expected = ALL_GITHUB_TOOL_NAMES.map(name => ({ name, write: isGithubWriteToolName(name) }))
    const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
    expect(rows.sort(byName)).toEqual(expected.sort(byName))
  })
})

describe('preset figure data', () => {
  it('matches PRESET_TOOLS and the write flags', async () => {
    // Not a static import: the docs app lives outside this package's tsconfig.
    const figure = await import(new URL('../../../apps/docs/app/utils/figure-data/presets.ts', import.meta.url).href) as {
      PRESET_TOOLS: Record<string, readonly string[]>
      WRITE_TOOLS: ReadonlySet<string>
      TOOL_GROUPS: readonly { tools: readonly string[] }[]
    }
    const { PRESET_TOOLS } = await import('./core/presets')
    expect(Object.fromEntries(Object.entries(figure.PRESET_TOOLS).map(([name, tools]) => [name, [...tools].sort()])))
      .toEqual(Object.fromEntries(Object.entries(PRESET_TOOLS).map(([name, tools]) => [name, [...new Set(tools)].sort()])))
    expect(figure.TOOL_GROUPS.flatMap(group => group.tools)).toEqual(ALL_GITHUB_TOOL_NAMES)
    expect([...figure.WRITE_TOOLS].sort()).toEqual(ALL_GITHUB_TOOL_NAMES.filter(isGithubWriteToolName).sort())
  })
})
