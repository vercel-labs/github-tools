import { describe, expect, it } from 'vitest'
import { shapeJobLog } from './workflows'

const line = (n: number, text: string) => `2026-08-28T12:00:${String(n % 60).padStart(2, '0')}.1234567Z ${text}`

describe('shapeJobLog', () => {
  it('strips the ISO timestamp prefix from every line', () => {
    const raw = [line(1, 'Set up job'), line(2, '##[error]Process completed with exit code 1.')].join('\n')
    expect(shapeJobLog(raw, 200)).toEqual({
      totalLines: 2,
      returnedLines: 2,
      omittedLines: 0,
      log: 'Set up job\n##[error]Process completed with exit code 1.',
    })
  })

  it('returns only the last maxLines lines and reports what was omitted', () => {
    const raw = Array.from({ length: 500 }, (_, i) => line(i, `step output ${i}`)).join('\n')
    const shaped = shapeJobLog(raw, 200)
    expect(shaped.totalLines).toBe(500)
    expect(shaped.returnedLines).toBe(200)
    expect(shaped.omittedLines).toBe(300)
    expect(shaped.log.startsWith('step output 300')).toBe(true)
    expect(shaped.log.endsWith('step output 499')).toBe(true)
  })

  it('normalizes CRLF and drops trailing newlines before counting', () => {
    const raw = `${line(1, 'one')}\r\n${line(2, 'two')}\n\n`
    expect(shapeJobLog(raw, 200).totalLines).toBe(2)
  })

  it('keeps lines without a timestamp prefix unchanged', () => {
    expect(shapeJobLog('plain line', 200).log).toBe('plain line')
  })
})
