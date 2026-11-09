import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ALL_GITHUB_TOOL_NAMES } from './core/tool-names'
import { isGithubWriteToolName } from './core/write-tools'

const catalogPage = readFileSync(new URL('../../../apps/docs/content/docs/5.reference/2.tools.md', import.meta.url), 'utf8')

// Rows look like "| `toolName` | Yes | Description |", with an empty second cell for read tools.
const rows = [...catalogPage.matchAll(/^\| `(\w+)` \|([^|]*)\|/gm)].map(([, name, write]) => ({ name: name!, write: write!.trim() !== '' }))

describe('tool catalog page', () => {
  it('lists every tool once, with its write flag', () => {
    const expected = ALL_GITHUB_TOOL_NAMES.map(name => ({ name, write: isGithubWriteToolName(name) }))
    const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
    expect(rows.sort(byName)).toEqual(expected.sort(byName))
  })
})
