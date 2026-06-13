#!/usr/bin/env node
/**
 * `github-tools eve` — scaffold CLI for the Eve framework.
 *
 * Generates one Eve tool file per selected tool under `agent/tools/`, each
 * default-exporting a tool from `@github-tools/sdk` wrapped with {@link toEveTool}.
 * Eve discovers tools from the filesystem, so the filename becomes the
 * model-facing tool name.
 *
 * Bundled to `dist/cli.mjs` (the package `bin`). It imports only from
 * {@link ./presets} and Node built-ins so it can bundle without pulling in the
 * `ai`/`zod`/`octokit` peer dependencies.
 *
 * @module
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import process from 'node:process'
import { GITHUB_TOOL_NAMES, GITHUB_WRITE_TOOL_NAMES, PRESET_TOOLS } from './presets'
import type { GithubToolName, GithubToolPreset } from './presets'

const PRESET_NAMES = Object.keys(PRESET_TOOLS) as GithubToolPreset[]
const WRITE_TOOLS = new Set<GithubToolName>(GITHUB_WRITE_TOOL_NAMES)

const HELP = `Scaffold Eve tool files wrapping @github-tools/sdk tools.

Eve discovers tools from files: each generated file default-exports one tool,
and the filename becomes the model-facing tool name.

Usage:
  github-tools eve [options]

Options:
  --preset <name>   Scaffold a preset's tools (repeatable, comma-separated).
                    Presets: ${PRESET_NAMES.join(', ')}
  --tools <names>   Scaffold specific tools (repeatable, comma-separated)
  --all             Scaffold all ${GITHUB_TOOL_NAMES.length} tools
  --dir <path>      Output directory (default: agent/tools)
  --force           Overwrite existing files
  --list            List all presets and tool names
  -h, --help        Show this help

Examples:
  github-tools eve --preset code-review
  github-tools eve --preset code-review,issue-triage --dir agent/tools
  github-tools eve --tools getRepository,mergePullRequest --force
`

/**
 * Render the `--list` output: every preset with its tool count, followed by
 * every tool name (write tools flagged as requiring approval).
 *
 * @returns The formatted multi-line listing.
 */
function listToolsAndPresets(): string {
  const lines: string[] = ['Presets:']
  for (const preset of PRESET_NAMES) {
    lines.push(`  ${preset} (${PRESET_TOOLS[preset].length} tools)`)
  }
  lines.push('', 'Tools:')
  for (const name of GITHUB_TOOL_NAMES) {
    lines.push(`  ${name}${WRITE_TOOLS.has(name) ? ' (write — requires approval)' : ''}`)
  }
  return lines.join('\n')
}

/**
 * Build the source of a generated Eve tool file: a default export wrapping the
 * SDK tool factory with `toEveTool`. Write tools additionally get a commented
 * `once()` approval snippet to swap in.
 *
 * @param name - The tool to wrap; also used as the import name and the filename.
 * @returns The TypeScript source for `agent/tools/<name>.ts`.
 */
function toolFileContent(name: GithubToolName): string {
  const header = [
    `import { ${name} } from '@github-tools/sdk'`,
    `import { githubToken, toEveTool } from '@github-tools/sdk/eve'`,
    '',
  ]
  if (WRITE_TOOLS.has(name)) {
    header.push(
      `// Write tool — requires approval before every call. To only ask once per session:`,
      `// import { once } from 'eve/tools/approval'`,
      `// export default toEveTool(${name}(githubToken()), { needsApproval: once() })`,
    )
  }
  header.push(`export default toEveTool(${name}(githubToken()))`, '')
  return header.join('\n')
}

/**
 * Flatten repeatable, comma-separated CLI option values into a trimmed,
 * non-empty list — e.g. `['a,b', 'c']` becomes `['a', 'b', 'c']`.
 *
 * @param values - Raw values collected for a `multiple` string option (may be undefined).
 * @returns The split, trimmed, non-empty tokens.
 */
function splitValues(values: string[] | undefined): string[] {
  return (values ?? []).flatMap(value => value.split(',')).map(value => value.trim()).filter(Boolean)
}

/**
 * Resolve the selection flags into a deduplicated list of tool names.
 * `--all` wins outright; otherwise the named presets and tools are unioned.
 *
 * @param selection - Parsed selection flags.
 * @param selection.presets - Preset names from `--preset`.
 * @param selection.tools - Tool names from `--tools`.
 * @param selection.all - Whether `--all` was passed.
 * @returns The unique tool names to scaffold, in insertion order.
 * @throws {Error} If a preset name or tool name is not recognized.
 */
function resolveSelection({ presets, tools, all }: { presets: string[], tools: string[], all: boolean }): GithubToolName[] {
  const selected = new Set<GithubToolName>()
  if (all) {
    for (const name of GITHUB_TOOL_NAMES) selected.add(name)
    return [...selected]
  }
  for (const preset of presets) {
    if (!(preset in PRESET_TOOLS)) {
      throw new Error(`Unknown preset "${preset}". Valid presets: ${PRESET_NAMES.join(', ')}`)
    }
    for (const name of PRESET_TOOLS[preset as GithubToolPreset]) selected.add(name)
  }
  for (const name of tools) {
    if (!(GITHUB_TOOL_NAMES as readonly string[]).includes(name)) {
      throw new Error(`Unknown tool "${name}". Run \`github-tools eve --list\` to see all tool names.`)
    }
    selected.add(name as GithubToolName)
  }
  return [...selected]
}

/**
 * Write one Eve tool file per name into `dir` (created if missing), then log a
 * per-file created/skipped report and a summary. Existing files are skipped
 * unless `force` is set.
 *
 * @param params - Scaffold parameters.
 * @param params.names - Tool names to scaffold.
 * @param params.dir - Output directory, resolved relative to `process.cwd()`.
 * @param params.force - Overwrite files that already exist.
 */
function scaffold({ names, dir, force }: { names: GithubToolName[], dir: string, force: boolean }): void {
  const outDir = resolve(process.cwd(), dir)
  mkdirSync(outDir, { recursive: true })

  const created: string[] = []
  const skipped: string[] = []
  for (const name of names) {
    const filePath = join(outDir, `${name}.ts`)
    if (existsSync(filePath) && !force) {
      skipped.push(name)
      continue
    }
    writeFileSync(filePath, toolFileContent(name))
    created.push(name)
  }

  for (const name of created) console.log(`  created ${join(dir, `${name}.ts`)}`)
  for (const name of skipped) console.log(`  skipped ${join(dir, `${name}.ts`)} (exists, use --force to overwrite)`)
  console.log(`\n${created.length} file${created.length === 1 ? '' : 's'} created, ${skipped.length} skipped.`)
  if (created.length > 0) {
    console.log('\nEve picks these up automatically — the filename is the tool name.')
    console.log('Make sure GITHUB_TOKEN is set in the app environment, and that')
    console.log('@github-tools/sdk, ai, and zod are installed in your Eve project.')
  }
}

/**
 * Parse argv with Node's `util.parseArgs` using the CLI's option schema.
 *
 * @param argv - CLI arguments excluding `node` and the script path.
 * @returns The parsed `values` and `positionals`.
 * @throws {TypeError} If an unknown option or an invalid value is supplied.
 */
function parseCliArgs(argv: string[]) {
  return parseArgs({
    args: argv,
    options: {
      preset: { type: 'string', multiple: true },
      tools: { type: 'string', multiple: true },
      all: { type: 'boolean' },
      dir: { type: 'string' },
      force: { type: 'boolean' },
      list: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  } as const)
}

/**
 * CLI entry point for `github-tools eve`. Parses argv, resolves the selected
 * tools, and scaffolds one Eve tool file per tool into the output directory.
 * Usage errors are printed (with help) rather than thrown.
 *
 * @param argv - CLI arguments excluding `node` and the script path
 *   (defaults to `process.argv.slice(2)`).
 * @returns The process exit code: `0` on success (or `--help`/`--list`), `1`
 *   on a usage error — unknown command/flag, nothing to scaffold, or an
 *   unknown preset/tool name.
 *
 * @example
 * ```sh
 * github-tools eve --preset code-review
 * github-tools eve --tools getRepository,mergePullRequest --force
 * github-tools eve --all --dir agent/tools
 * ```
 */
export function main(argv: string[] = process.argv.slice(2)): number {
  let parsed: ReturnType<typeof parseCliArgs>
  try {
    parsed = parseCliArgs(argv)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    console.error(HELP)
    return 1
  }

  const { values, positionals } = parsed
  const command = positionals[0]

  if (values.help || command === undefined) {
    console.log(HELP)
    return values.help ? 0 : 1
  }
  if (command !== 'eve') {
    console.error(`Unknown command "${command}".\n`)
    console.error(HELP)
    return 1
  }
  if (values.list) {
    console.log(listToolsAndPresets())
    return 0
  }

  const presets = splitValues(values.preset)
  const tools = splitValues(values.tools)
  if (!values.all && presets.length === 0 && tools.length === 0) {
    console.error('Nothing to scaffold: pass --preset, --tools, or --all.\n')
    console.error(HELP)
    return 1
  }

  try {
    const names = resolveSelection({ presets, tools, all: values.all ?? false })
    scaffold({ names, dir: values.dir ?? 'agent/tools', force: values.force ?? false })
    return 0
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    return 1
  }
}

process.exitCode = main()
