import { describe, expect, it } from 'vitest'
import { getEveTools } from './load-eve'

describe('load-eve', () => {
  it('loads eve/tools when the peer dependency is installed', () => {
    expect(getEveTools().defineTool).toBeTypeOf('function')
    expect(getEveTools().defineDynamic).toBeTypeOf('function')
  })
})
