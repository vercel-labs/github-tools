import { execFile } from 'node:child_process'
import type { JustBashCommand } from 'eve/experimental/sandbox/just-bash'
import { logLine } from './log.ts'

// Read-only subcommands; every other `gh` call is a write and gets a stubbed success, like the
// GitHub tools' writes in the other configs, so the benchmark never changes a repository.
const READ_VERBS = new Set(['view', 'list', 'status', 'diff', 'checks'])
const FIELD_FLAGS = new Set(['-f', '-F', '--field', '--raw-field', '--input'])

function isRead(args: readonly string[]): boolean {
  const [noun, verb] = args
  if (noun === 'search') return true
  if (noun !== 'api') return READ_VERBS.has(verb ?? '')
  const methodIndex = args.findIndex(arg => arg === '-X' || arg === '--method')
  const method = methodIndex === -1 ? undefined : args[methodIndex + 1]?.toUpperCase()
  if (verb === 'graphql') return !args.some(arg => /^query=\s*mutation\b/.test(arg))
  if (method) return method === 'GET'
  return !args.some(arg => FIELD_FLAGS.has(arg))
}

/**
 * `gh` for the `cli` config's just-bash sandbox. Reads run the host's authenticated `gh`, so the
 * token never enters the sandbox; writes are logged to writes.jsonl and answered with a stub.
 */
export function ghCommand(tags: Record<string, string>): JustBashCommand {
  return {
    name: 'gh',
    trusted: true,
    async execute(args) {
      if (args[0] === 'auth' && args[1] === 'token') return { exitCode: 1, stdout: '', stderr: 'gh auth token is not available here\n' }
      if (!isRead(args)) {
        logLine('writes.jsonl', { ...tags, method: 'gh', args })
        return { exitCode: 0, stdout: `${JSON.stringify({ stubbed: true, url: 'https://github.com/stubbed/1', number: 1 })}\n`, stderr: '' }
      }
      return new Promise((resolve) => {
        execFile('gh', args, { env: { ...process.env, GH_PROMPT_DISABLED: '1', GH_PAGER: 'cat', NO_COLOR: '1' }, maxBuffer: 20 * 1024 * 1024, timeout: 60_000 }, (error, stdout, stderr) => {
          resolve({ exitCode: error ? (typeof error.code === 'number' ? error.code : 1) : 0, stdout, stderr })
        })
      })
    },
  }
}
