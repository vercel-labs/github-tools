import type { ToolDefinition } from 'eve/tools'
import { resolvePresetTools, type CombinedPresetToolNames, type GithubToolPreset, type PresetToolName } from '../core/presets'
import { createGithubTokenResolver } from '../core/token'
import { mapEveApprovalValue, resolveEveToolApproval } from './approval'
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
  return {
    ...tool,
    ...override.description !== undefined && { description: override.description },
    ...override.toModelOutput !== undefined && { toModelOutput: override.toModelOutput },
    ...override.outputSchema !== undefined && { outputSchema: override.outputSchema },
  }
}

function createBuildContext(options: BuildOptions): ToolBuildContext {
  return {
    token: createGithubTokenResolver(options.token),
    context: options.context,
    author: options.author,
    committer: options.committer,
    coAuthors: options.coAuthors,
  }
}

function defineGithubTool(
  name: GithubToolName,
  ctx: ToolBuildContext,
  options: BuildOptions,
): ToolDefinition {
  const { defineTool } = getEveTools()
  const entry = createToolRegistry(ctx).find(tool => tool.name === name)
  if (!entry) throw new Error(`Unknown GitHub tool: ${name}`)

  const approval = entry.writeTool
    ? resolveEveToolApproval(
        entry.writeTool,
        options.requireApproval,
        options.authorizeApprovalResponse,
        options.overrides?.[name]?.approval,
      )
    : options.overrides?.[name]?.approval === undefined
      ? undefined
      : mapEveApprovalValue(options.overrides[name]!.approval!)

  return defineTool({
    description: entry.description,
    inputSchema: entry.inputSchema,
    ...(approval !== undefined && { approval }),
    ...(entry.toModelOutput && { toModelOutput: entry.toModelOutput }),
    execute: async input => runGithubToolStep(name, input as Record<string, unknown>, ctx),
  })
}

export function buildEveToolDefinition(name: GithubToolName, options: BuildOptions = {}): ToolDefinition {
  const ctx = createBuildContext(options)
  return applyOverrides(defineGithubTool(name, ctx, options), name, options.overrides)
}

export function buildEveToolMap(options: EveGithubToolsOptions = {}): EveToolMap {
  const ctx = createBuildContext(options)
  const isAllowed = resolveAllowedToolNames(options)
  const tools = {} as EveToolMap

  for (const { name } of createToolRegistry(ctx)) {
    if (!isAllowed(name)) continue
    tools[name] = applyOverrides(defineGithubTool(name, ctx, options), name, options.overrides)
  }

  return tools
}

export function createEveGithubToolsDynamic(options: EveGithubToolsOptions = {}) {
  const { defineDynamic } = getEveTools()
  return defineDynamic({
    events: {
      'session.started': async () => buildEveToolMap(options),
    },
  })
}

export function listResolvedEveToolNames(options?: { preset?: undefined, include?: undefined, exclude?: undefined }): GithubToolName[]
export function listResolvedEveToolNames<P extends GithubToolPreset>(options: { preset: P, include?: undefined, exclude?: undefined }): PresetToolName<P>[]
export function listResolvedEveToolNames<P extends readonly GithubToolPreset[]>(options: { preset: P, include?: undefined, exclude?: undefined }): CombinedPresetToolNames<P>[]
export function listResolvedEveToolNames(options: Pick<EveGithubToolsOptions, 'preset' | 'include' | 'exclude'>): GithubToolName[]
export function listResolvedEveToolNames(options: Pick<EveGithubToolsOptions, 'preset' | 'include' | 'exclude'> = {}): GithubToolName[] {
  return ALL_GITHUB_TOOL_NAMES.filter(resolveAllowedToolNames(options))
}

export function listEveToolDescriptors(options: EveGithubToolsOptions = {}) {
  const ctx = createBuildContext(options)
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

export async function executeGithubEveTool(
  name: GithubToolName,
  input: Record<string, unknown>,
  options: EveGithubToolsOptions = {},
) {
  return runGithubToolStep(name, input, createBuildContext(options))
}
