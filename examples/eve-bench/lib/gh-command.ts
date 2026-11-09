import { execFile } from 'node:child_process'
import type { JustBashCommand } from 'eve/experimental/sandbox/just-bash'
import { logLine } from './log.ts'

export type GhDecision = { kind: 'read' } | { kind: 'write' } | { kind: 'deny', reason: string }

// Commands that run the host's `gh`. Anything else is a write and gets a stubbed success, like
// the GitHub tools' writes in the other configs, so the benchmark never changes a repository.
const READ_COMMANDS: Record<string, ReadonlySet<string>> = {
  pr: new Set(['view', 'list', 'diff', 'checks', 'status']),
  issue: new Set(['view', 'list', 'status']),
  repo: new Set(['view', 'list']),
  run: new Set(['view', 'list']),
  workflow: new Set(['view', 'list']),
  release: new Set(['view', 'list']),
  label: new Set(['list']),
  search: new Set(['repos', 'issues', 'prs', 'code', 'commits']),
}

// These act on the host's `gh` setup (credentials, config, extensions), not on GitHub.
const HOST_NOUNS = new Set(['auth', 'config', 'alias', 'extension'])

// `gh api` flags and whether they take a value. Unknown flags are refused rather than guessed at.
const API_FLAGS: Record<string, { name: string, value: boolean }> = {
  '-X': { name: 'method', value: true },
  '--method': { name: 'method', value: true },
  '-f': { name: 'raw-field', value: true },
  '--raw-field': { name: 'raw-field', value: true },
  '-F': { name: 'field', value: true },
  '--field': { name: 'field', value: true },
  '-H': { name: 'header', value: true },
  '--header': { name: 'header', value: true },
  '-q': { name: 'jq', value: true },
  '--jq': { name: 'jq', value: true },
  '-t': { name: 'template', value: true },
  '--template': { name: 'template', value: true },
  '-p': { name: 'preview', value: true },
  '--preview': { name: 'preview', value: true },
  '--cache': { name: 'cache', value: true },
  '--paginate': { name: 'paginate', value: false },
  '--slurp': { name: 'slurp', value: false },
  '-i': { name: 'include', value: false },
  '--include': { name: 'include', value: false },
  '--silent': { name: 'silent', value: false },
}

type ApiFlag = { name: string, value?: string }

const deny = (reason: string): GhDecision => ({ kind: 'deny', reason })

// Reads `--name=value` and attached short values (`-XDELETE`, `-X=DELETE`) the way gh's flag parser does.
function parseApiArgs(args: readonly string[]): { flags: ApiFlag[], positionals: string[] } | string {
  const flags: ApiFlag[] = []
  const positionals: string[] = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--') {
      positionals.push(...args.slice(i + 1))
      break
    }
    if (!arg.startsWith('-') || arg === '-') {
      positionals.push(arg)
      continue
    }
    const long = arg.startsWith('--')
    const equals = long ? arg.indexOf('=') : -1
    const flag = API_FLAGS[equals !== -1 ? arg.slice(0, equals) : long ? arg : arg.slice(0, 2)]
    if (!flag) return `unsupported gh api flag: ${arg}`
    const attached = equals !== -1 ? arg.slice(equals + 1) : !long && arg.length > 2 ? arg.slice(2).replace(/^=/, '') : undefined
    if (!flag.value) {
      if (attached !== undefined) return `unsupported gh api flag: ${arg}`
      flags.push({ name: flag.name })
      continue
    }
    const value = attached ?? args[++i]
    if (value === undefined) return `missing value for ${arg}`
    flags.push({ name: flag.name, value })
  }
  return { flags, positionals }
}

function classifyApi(args: readonly string[]): GhDecision {
  const parsed = parseApiArgs(args)
  if (typeof parsed === 'string') return deny(parsed)
  const { flags, positionals } = parsed
  if (positionals.length !== 1) return deny('gh api takes exactly one endpoint')
  const endpoint = positionals[0]!
  if (endpoint.includes('://')) return deny('gh api only takes a path')

  const values = (name: string) => flags.filter(flag => flag.name === name).map(flag => flag.value!)
  const fields = [...values('field'), ...values('raw-field')]
  if (values('field').some(field => /^[^=]*=@/.test(field))) return deny('gh api file and stdin fields are not available here')
  if (values('header').some(header => !/^accept\s*:/i.test(header))) return deny('gh api only takes Accept headers here')

  if (endpoint === 'graphql') {
    const query = fields.find(field => field.startsWith('query='))?.slice('query='.length)
    if (query === undefined) return deny('gh api graphql needs a query field')
    // Any mention of a mutation, outside comments, counts as one: a stubbed read costs less than a real write.
    return /\b(?:mutation|subscription)\b/.test(query.replace(/#[^\n]*/g, '')) ? { kind: 'write' } : { kind: 'read' }
  }

  const method = values('method').at(-1)?.toUpperCase()
  if (method) return method === 'GET' || method === 'HEAD' ? { kind: 'read' } : { kind: 'write' }
  // Without -X, gh sends a POST as soon as there is a field.
  return fields.length === 0 ? { kind: 'read' } : { kind: 'write' }
}

/** Decides whether a `gh` call runs on the host, gets a stubbed write, or is refused. */
export function classifyGh(args: readonly string[]): GhDecision {
  const [noun, verb] = args
  if (noun === 'api') return classifyApi(args.slice(1))
  if (noun && HOST_NOUNS.has(noun)) return deny(`gh ${noun} is not available here`)
  if (!noun || !verb || !READ_COMMANDS[noun]?.has(verb)) return { kind: 'write' }
  if (args.some(arg => arg === '--web' || arg.startsWith('--web='))) return deny('--web is not available here')
  return { kind: 'read' }
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
      const decision = classifyGh(args)
      if (decision.kind === 'deny') return { exitCode: 1, stdout: '', stderr: `${decision.reason}\n` }
      if (decision.kind === 'write') {
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
