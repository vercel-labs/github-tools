import type { ToolDefinition } from 'eve/tools'
import { resolvePresetTools, type CombinedPresetToolNames, type GithubToolPreset, type PresetToolName } from '../core/presets'
import { createGithubTokenResolver } from '../core/token'
import { mapEveApprovalValue, resolveEveApprovalDefinition } from './approval'
import { getEveTools } from './load-eve'
import { ALL_GITHUB_TOOL_NAMES, createToolRegistry, type GithubToolName, type ToolBuildContext } from './registry'
import type { GithubWriteToolName } from '../core/write-tools'
import { runGithubToolStep } from './steps'
import type { EveGithubToolsOptions, EveToolFactoryOptions, EveToolOverrides } from './types'

type BuildOptions = EveGithubToolsOptions | (EveToolFactoryOptions & { preset?: EveGithubToolsOptions['preset'] })
type EveToolMap = Partial<Record<GithubToolName, ToolDefinition>>

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

function resolveToolApproval(
  name: GithubToolName,
  writeTool: GithubWriteToolName | undefined,
  options: BuildOptions,
): ToolDefinition['approval'] | undefined {
  const override = options.overrides?.[name]?.approval
  if (!writeTool) return override === undefined ? undefined : mapEveApprovalValue(override)

  return resolveEveApprovalDefinition(
    writeTool,
    options.requireApproval,
    options.authorizeApprovalResponse,
    override,
  )
}

export function buildEveToolDefinition(
  name: GithubToolName,
  options: BuildOptions = {},
): ToolDefinition {
  const { defineTool } = getEveTools()
  const ctx: ToolBuildContext = {
    token: createGithubTokenResolver(options.token),
    author: options.author,
    committer: options.committer,
    coAuthors: options.coAuthors,
  }

  const entry = createToolRegistry(ctx).find(tool => tool.name === name)
  if (!entry) {
    throw new Error(`Unknown GitHub tool: ${name}`)
  }

  const tool = defineTool({
    description: entry.description,
    inputSchema: entry.inputSchema,
    ...(entry.writeTool || options.overrides?.[name]?.approval !== undefined) && {
      approval: resolveToolApproval(name, entry.writeTool, options),
    },
    ...(entry.toModelOutput && { toModelOutput: entry.toModelOutput }),
    execute: async (input) => runGithubToolStep(name, input as Record<string, unknown>, ctx),
  })

  return applyOverrides(tool, name, options.overrides)
}

export function buildEveToolMap(options: EveGithubToolsOptions = {}): EveToolMap {
  const { defineTool } = getEveTools()
  const ctx: ToolBuildContext = {
    token: createGithubTokenResolver(options.token),
    author: options.author,
    committer: options.committer,
    coAuthors: options.coAuthors,
  }

  const allowed = options.preset ? resolvePresetTools(options.preset) : null
  const registry = createToolRegistry(ctx)
  const tools = {} as EveToolMap

  for (const entry of registry) {
    if (allowed && !allowed.has(entry.name)) continue

    const tool = defineTool({
      description: entry.description,
      inputSchema: entry.inputSchema,
      ...(entry.writeTool || options.overrides?.[entry.name]?.approval !== undefined) && {
        approval: resolveToolApproval(entry.name, entry.writeTool, options),
      },
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
  return defineDynamic({
    events: {
      'session.started': async () => buildEveToolMap(options),
    },
  })
}

export function listResolvedEveToolNames(options?: { preset?: undefined }): GithubToolName[]
export function listResolvedEveToolNames<P extends GithubToolPreset>(options: { preset: P }): PresetToolName<P>[]
export function listResolvedEveToolNames<P extends readonly GithubToolPreset[]>(options: { preset: P }): CombinedPresetToolNames<P>[]
export function listResolvedEveToolNames(options: Pick<EveGithubToolsOptions, 'preset'> = {}): GithubToolName[] {
  if (!options.preset) return [...ALL_GITHUB_TOOL_NAMES]
  return ALL_GITHUB_TOOL_NAMES.filter(name => resolvePresetTools(options.preset!)!.has(name))
}
