import { describe, expect, it } from 'vitest'
import { MISSING_EVE_MESSAGE, getEveTools } from './load-eve'

describe('load-eve', () => {
  it('exports a clear install message for the optional peer dependency', () => {
    expect(MISSING_EVE_MESSAGE).toBe(
      'The "eve" package is required to use @github-tools/sdk/eve. Install it with: pnpm add eve',
    )
  })

  it('loads eve/tools when the peer dependency is installed', () => {
    expect(getEveTools().defineTool).toBeTypeOf('function')
    expect(getEveTools().defineDynamic).toBeTypeOf('function')
  })
})
