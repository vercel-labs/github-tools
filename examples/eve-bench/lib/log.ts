import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

/** Prefix of the `t.log` line that tags an eval artifact with its task, config and level. */
export const BENCH_LOG_PREFIX = 'bench:'

export const BENCH_LOG_DIR = process.env.BENCH_LOG_DIR ?? join(process.cwd(), '.eve', 'bench')

/** Appends one JSON line to `<BENCH_LOG_DIR>/<file>`; the report script aggregates these. */
export function logLine(file: string, data: Record<string, unknown>) {
  mkdirSync(BENCH_LOG_DIR, { recursive: true })
  appendFileSync(join(BENCH_LOG_DIR, file), `${JSON.stringify({ at: new Date().toISOString(), ...data })}\n`)
}
