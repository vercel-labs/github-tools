import type { ToolDefinition } from 'eve/tools'
import { resolvePresetTools, type CombinedPresetToolNames, type GithubToolPreset, type PresetToolName } from '../core/presets'
import { createGithubTokenResolver } from '../core/token'
import { isEveApprovalDisabled, mapEveApprovalValue, resolveEveToolApproval } from './approval'
import { getEveTools } from './load-eve'
import { ALL_GITHUB_TOOL_NAMES, createToolRegistry, type GithubToolName, type ToolBuildContext } from './registry'
import { runGithubToolStep } from './steps'
import type { EveGithubToolsOptions, EveToolFactoryOptions, EveToolOverrides } from './types'

type BuildOptions = EveGithubToolsOptions | (EveToolFactoryOptions & { preset?: EveGithubToolsOptions['preset'] })
type EveToolMap = Partial<Record<GithubToolName, ToolDefinition>>

function resolveAllowedToolNames(
  options: Pick<EveGithubToolsOptions, 'preset' | 'include' | 'exclude'>,
): (name: GithubToolName) => boolean {
  const presetAllowed = options.preset ? resolvePresetTools(options.preset) : null
  const includeAllowed = options.include ? new Set(options.include) : null
  const excluded = options.exclude ? new Set(options.exclude) : null

  // `preset` and `include` compose as a union (add tools a preset is missing);
  // `exclude` always subtracts from that combined set afterward.
  const allowed = presetAllowed && includeAllowed
    ? new Set([...presetAllowed, ...includeAllowed])
    : presetAllowed ?? includeAllowed

  return name => (!allowed || allowed.has(name)) && !excluded?.has(name)
}

function applyOverrides<T extends ToolDefinition>(
  tool: T,
  name: GithubToolName,
  overrides?: EveToolOverrides,
): T {
  const override = overrides?.[name]
  if (!override) return tool

  const next: T = {
    ...tool,
    ...override.description !== undefined && { description: override.description },
    ...override.toModelOutput !== undefined && { toModelOutput: override.toModelOutput },
    ...override.outputSchema !== undefined && { outputSchema: override.outputSchema },
  }

  if (override.approval === undefined) return next
  if (isEveApprovalDisabled(override.approval)) {
    const rest = { ...next }
    delete (rest as { approval?: unknown }).approval
    return rest
  }
  return { ...next, approval: mapEveApprovalValue(override.approval) }
}

export function buildEveToolDefinition(
  name: GithubToolName,
  options: BuildOptions = {},
): ToolDefinition {
  const { defineTool } = getEveTools()
  const ctx: ToolBuildContext = {
    token: createGithubTokenResolver(options.token),
    context: options.context,
    author: options.author,
    committer: options.committer,
    coAuthors: options.coAuthors,
  }

  const entry = createToolRegistry(ctx).find(tool => tool.name === name)
  if (!entry) {
    throw new Error(`Unknown GitHub tool: ${name}`)
  }

  const approval = entry.writeTool
    ? resolveEveToolApproval(entry.writeTool, options.requireApproval)
    : undefined

  const tool = defineTool({
    description: entry.description,
    inputSchema: entry.inputSchema,
    ...(approval && { approval }),
    ...(entry.toModelOutput && { toModelOutput: entry.toModelOutput }),
    execute: async (input) => runGithubToolStep(name, input as Record<string, unknown>, ctx),
  })

  return applyOverrides(tool, name, options.overrides)
}

export function buildEveToolMap(options: EveGithubToolsOptions = {}): EveToolMap {
  const { defineTool } = getEveTools()
  const ctx: ToolBuildContext = {
    token: createGithubTokenResolver(options.token),
    context: options.context,
    author: options.author,
    committer: options.committer,
    coAuthors: options.coAuthors,
  }

  const isAllowed = resolveAllowedToolNames(options)
  const registry = createToolRegistry(ctx)
  const tools = {} as EveToolMap

  for (const entry of registry) {
    if (!isAllowed(entry.name)) continue

    const approval = entry.writeTool
      ? resolveEveToolApproval(entry.writeTool, options.requireApproval)
      : undefined

    const tool = defineTool({
      description: entry.description,
      inputSchema: entry.inputSchema,
      ...(approval && { approval }),
      ...(entry.toModelOutput && { toModelOutput: entry.toModelOutput }),
      execute: async (input) => runGithubToolStep(entry.name, input as Record<string, unknown>, ctx),
    })

    tools[entry.name] = applyOverrides(tool, entry.name, options.overrides)
  }

  return tools
}

export function createEveGithubToolsDynamic(options: EveGithubToolsOptions = {}) {
  const { defineDynamic } = getEveTools()

  // TODO(eve-auth): resolve token from ctx.getToken('github') when eve-managed auth lands.
  // Deferred — eve does not yet expose managed GitHub tokens on the session context.
  return defineDynamic({
    events: {
      'step.started': async () => buildEveToolMap(options),
    },
  })
}

export function listResolvedEveToolNames(options?: { preset?: undefined, include?: undefined, exclude?: undefined }): GithubToolName[]
export function listResolvedEveToolNames<P extends GithubToolPreset>(options: { preset: P, include?: undefined, exclude?: undefined }): PresetToolName<P>[]
export function listResolvedEveToolNames<P extends readonly GithubToolPreset[]>(options: { preset: P, include?: undefined, exclude?: undefined }): CombinedPresetToolNames<P>[]
export function listResolvedEveToolNames(options: Pick<EveGithubToolsOptions, 'preset' | 'include' | 'exclude'>): GithubToolName[]
export function listResolvedEveToolNames(options: Pick<EveGithubToolsOptions, 'preset' | 'include' | 'exclude'> = {}): GithubToolName[] {
  const isAllowed = resolveAllowedToolNames(options)
  return ALL_GITHUB_TOOL_NAMES.filter(isAllowed)
}

/**
 * Tool descriptors (no `execute`) for authored eve `defineTool` loops.
 * Prefer this when registering tools outside the SDK package so durable transforms can hoist inline execute.
 */
export function listEveToolDescriptors(options: EveGithubToolsOptions = {}) {
  const ctx: ToolBuildContext = {
    token: createGithubTokenResolver(options.token),
    context: options.context,
    author: options.author,
    committer: options.committer,
    coAuthors: options.coAuthors,
  }

  const isAllowed = resolveAllowedToolNames(options)
  return createToolRegistry(ctx)
    .filter(entry => isAllowed(entry.name))
    .map(entry => ({
      name: entry.name,
      description: entry.description,
      inputSchema: entry.inputSchema,
      writeTool: entry.writeTool,
      toModelOutput: entry.toModelOutput,
    }))
}

/**
 * Execute a GitHub tool by name with the given eve options (token/context/attribution).
 * Used by `@github-tools/eve-extension` so `execute` only closes over a serializable tool name.
 */
export async function executeGithubEveTool(
  name: GithubToolName,
  input: Record<string, unknown>,
  options: EveGithubToolsOptions = {},
) {
  const ctx: ToolBuildContext = {
    token: createGithubTokenResolver(options.token),
    context: options.context,
    author: options.author,
    committer: options.committer,
    coAuthors: options.coAuthors,
  }
  return runGithubToolStep(name, input, ctx)
}
