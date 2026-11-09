import { toolDefinition } from '@tanstack/ai'
import type { ServerTool } from '@tanstack/ai'
import type { z } from 'zod'
import { GITHUB_TOOL_CATALOG, isGithubWriteToolName } from '../core/catalog'
import { GITHUB_TOOL_CORES } from '../core/cores'
import { resolveApprovalMode, type ApprovalConfig, type ToolApprovalMode } from '../core/approval-policy'
import { mergeContextArgs, softenContextSchema, type GithubToolsContext } from '../core/context'
import { resolvePresetTools, type GithubToolPreset, type PresetToolName } from '../core/presets'
import { githubTokenCall, withGithubGuardrails, type GithubTokenInput } from '../core/token'
import type { GithubGuardrails } from '../core/guardrails'
import { dryRunWrite, type GithubDryRunResult } from '../core/dry-run'
import type { GithubToolName } from '../core/tool-names'
import { ALL_GITHUB_TOOL_NAMES } from '../core/tool-names'
import { stripRateLimit } from '../core/rate-limit'
import type { CommitIdentity } from '../types'
import type { GithubWriteToolName } from '../core/write-tools'

type Catalog = typeof GITHUB_TOOL_CATALOG
type CoreResult<N extends GithubToolName> = Awaited<ReturnType<(typeof GITHUB_TOOL_CORES)[N]>>

/**
 * A TanStack server tool with the catalog's input schema and core return type. A write tool created
 * with `dryRun: true` returns a `GithubDryRunResult` instead, so narrow with `'dryRun' in result`.
 */
export type GithubTanstackTool<N extends GithubToolName = GithubToolName> = N extends GithubToolName
  ? Omit<ServerTool<Catalog[N]['inputSchema'], undefined, N, unknown, boolean>, 'execute'> & {
    execute: (input: z.input<Catalog[N]['inputSchema']>) => Promise<N extends GithubWriteToolName ? CoreResult<N> | GithubDryRunResult : CoreResult<N>>
  }
  : never

/** Supported TanStack tool customizations. */
export type TanstackToolOverrides = {
  description?: string
  needsApproval?: boolean
}

/** Options shared by TanStack tool factories. */
export type TanstackToolOptions = Omit<TanstackToolOverrides, 'needsApproval'> & {
  needsApproval?: ToolApprovalMode
  context?: GithubToolsContext
  author?: CommitIdentity
  committer?: CommitIdentity
  coAuthors?: CommitIdentity[]
  /** Repositories and branches the tool may act on, checked before each call reaches GitHub. */
  guardrails?: GithubGuardrails
  /** Send no write to GitHub: a write returns a `GithubDryRunResult` instead, after the guardrails check. */
  dryRun?: boolean
}

/** Configuration for a native array of GitHub server tools. */
export type CreateGithubToolsOptions = Omit<TanstackToolOptions, 'description' | 'needsApproval'> & {
  token?: GithubTokenInput
  preset?: GithubToolPreset | readonly GithubToolPreset[]
  requireApproval?: ApprovalConfig
  overrides?: Partial<Record<GithubToolName, TanstackToolOverrides>>
}

export const autoTools = new WeakMap<object, { name: GithubToolName, resolveInput: (input: unknown) => Record<string, unknown> }>()

function buildTool<N extends GithubToolName>(name: N, token: GithubTokenInput | undefined, options: TanstackToolOptions): GithubTanstackTool<N> {
  const descriptor = GITHUB_TOOL_CATALOG[name]
  const resolveToken = withGithubGuardrails(token, options.guardrails)
  const inputSchema = options.context ? softenContextSchema(descriptor.inputSchema, options.context) : descriptor.inputSchema
  const resolveInput = (input: unknown): Record<string, unknown> => {
    const args = inputSchema.parse(input) as Record<string, unknown>
    return options.context ? mergeContextArgs(args, options.context) : args
  }
  const mode = options.needsApproval ?? (isGithubWriteToolName(name) ? true : false)
  const core = GITHUB_TOOL_CORES[name] as (input: Record<string, unknown> & { token: string }) => Promise<unknown>
  const built = toolDefinition({
    name,
    description: options.description ?? descriptor.description,
    inputSchema,
    // A dry run asks nobody; each result reports what approval would have decided instead.
    needsApproval: mode !== false && !options.dryRun,
  }).server(async (input) => {
    const resolved = resolveInput(input)
    if (options.dryRun && isGithubWriteToolName(name)) {
      // `'auto'` is decided by the approval middleware, which a dry-run write never reaches.
      return dryRunWrite(name, resolved, options.guardrails, () => mode === 'auto' ? undefined : { required: mode })
    }
    const attribution = name === 'createOrUpdateFile' || name === 'editFiles'
      ? { author: options.author, committer: options.committer, coAuthors: options.coAuthors }
      : name === 'mergePullRequest' || name === 'enablePullRequestAutoMerge' ? { coAuthors: options.coAuthors, branches: options.guardrails?.branches }
      : name === 'updatePullRequestBranch' ? { guardrails: options.guardrails } : {}
    return stripRateLimit(await core({ ...resolved, ...attribution, token: await resolveToken(githubTokenCall(name, resolved)) }))
  })
  if (mode === 'auto' && !options.dryRun) autoTools.set(built, { name, resolveInput })
  return built as unknown as GithubTanstackTool<N>
}

export function toolFactory<N extends GithubToolName>(name: N) {
  return (token: GithubTokenInput, options: TanstackToolOptions = {}): GithubTanstackTool<N> => buildTool(name, token, options)
}

/** Create TanStack server tools, optionally restricted to one or more presets. */
export function createGithubTools<const P extends GithubToolPreset | readonly GithubToolPreset[] | undefined = undefined>(
  options: CreateGithubToolsOptions & { preset?: P } = {},
): GithubTanstackTool<P extends GithubToolPreset ? PresetToolName<P> : P extends readonly GithubToolPreset[] ? PresetToolName<P[number]> : GithubToolName>[] {
  const allowed = options.preset ? resolvePresetTools(typeof options.preset === 'string' ? options.preset : [...options.preset]) : null
  const tools = ALL_GITHUB_TOOL_NAMES.filter(name => !allowed || allowed.has(name)).map(name => buildTool(name, options.token, {
    context: options.context,
    author: options.author,
    committer: options.committer,
    coAuthors: options.coAuthors,
    needsApproval: isGithubWriteToolName(name) ? resolveApprovalMode(name, options.requireApproval ?? true) : false,
    ...options.overrides?.[name],
    guardrails: options.guardrails,
    dryRun: options.dryRun,
  }))
  return tools as ReturnType<typeof createGithubTools<P>>
}
