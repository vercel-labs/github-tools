import { toolDefinition } from '@tanstack/ai'
import type { ServerTool } from '@tanstack/ai'
import type { z } from 'zod'
import { GITHUB_TOOL_CATALOG, isGithubWriteToolName } from '../core/catalog'
import { resolveApprovalMode, type ApprovalConfig, type ToolApprovalMode } from '../core/approval-policy'
import { mergeContextArgs, softenContextSchema, type GithubToolsContext } from '../core/context'
import { resolvePresetTools, type GithubToolPreset, type PresetToolName } from '../core/presets'
import { createGithubTokenResolver, githubTokenCall, type GithubTokenInput } from '../core/token'
import type { GithubToolName } from '../core/tool-names'
import { ALL_GITHUB_TOOL_NAMES } from '../core/tool-names'
import { stripRateLimit } from '../core/rate-limit'
import type { CommitIdentity } from '../types'

type Catalog = typeof GITHUB_TOOL_CATALOG
/** A TanStack server tool with the catalog's input schema and core return type. */
export type GithubTanstackTool<N extends GithubToolName = GithubToolName> = N extends GithubToolName
  ? Omit<ServerTool<Catalog[N]['inputSchema'], undefined, N, unknown, boolean>, 'execute'> & {
    execute: (input: z.input<Catalog[N]['inputSchema']>) => ReturnType<Catalog[N]['core']>
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
  const resolveToken = createGithubTokenResolver(token)
  const inputSchema = options.context ? softenContextSchema(descriptor.inputSchema, options.context) : descriptor.inputSchema
  const resolveInput = (input: unknown): Record<string, unknown> => {
    const args = inputSchema.parse(input) as Record<string, unknown>
    return options.context ? mergeContextArgs(args, options.context) : args
  }
  const mode = options.needsApproval ?? (isGithubWriteToolName(name) ? true : false)
  const core = descriptor.core as (input: Record<string, unknown> & { token: string }) => Promise<unknown>
  const built = toolDefinition({
    name,
    description: options.description ?? descriptor.description,
    inputSchema,
    needsApproval: mode !== false,
  }).server(async (input) => {
    const resolved = resolveInput(input)
    const attribution = name === 'createOrUpdateFile'
      ? { author: options.author, committer: options.committer, coAuthors: options.coAuthors }
      : name === 'mergePullRequest' ? { coAuthors: options.coAuthors } : {}
    return stripRateLimit(await core({ ...resolved, ...attribution, token: await resolveToken(githubTokenCall(name, resolved)) }))
  })
  if (mode === 'auto') autoTools.set(built, { name, resolveInput })
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
  }))
  return tools as ReturnType<typeof createGithubTools<P>>
}
