import { connectGithubToken } from '@github-tools/sdk/connect'
import {
  executeGithubEveTool,
  formatGithubEveToolOutput,
  GITHUB_WRITE_TOOLS,
  isEveApprovalDisabled,
  listEveToolDescriptors,
  mapEveApprovalValue,
  resolveEveApproval,
  resolveGithubToken,
  type EveApprovalConfig,
  type EveApprovalValue,
  type EveGithubToolsOptions,
  type EveToolOverrides,
  type GithubToolName,
  type GithubWriteToolName,
} from '@github-tools/sdk/eve-runtime'
import type { ApprovalContext } from 'eve/tools/approval'
import { defineDynamic, defineTool, type ToolContext, type ToolDefinition } from 'eve/tools'
import extension from '../extension'

/**
 * Rebuild options from extension config on every call.
 * Durable `execute` / `toModelOutput` / `approval` only close over a serializable
 * tool `name` (#51, #99). Those three must be direct `defineTool` properties —
 * a spread or call expression is invisible to eve's stamp, and 0.44+ then
 * drops the whole toolset.
 */
function buildSessionOptions(ctx?: ToolContext): EveGithubToolsOptions {
  const {
    token,
    connector,
    connect,
    preset,
    include,
    exclude,
    requireApproval,
    overrides,
    context,
    author,
    committer,
    coAuthors,
  } = extension.config

  const includeNames = include as GithubToolName[] | undefined
  const excludeNames = exclude as GithubToolName[] | undefined

  // `connect.subject` may be a per-caller resolver; it needs the execution
  // context, so the token is minted lazily, per tool call.
  const resolvedToken = connector
    ? async () => {
        const { subject, ...params } = connect ?? {}
        const resolvedSubject = typeof subject === 'function'
          ? await subject(requireToolContext(ctx))
          : subject
        return resolveGithubToken(connectGithubToken(connector, {
          preset,
          include: includeNames,
          exclude: excludeNames,
          params: { ...params, ...(resolvedSubject && { subject: resolvedSubject }) },
        }))
      }
    : token

  return {
    token: resolvedToken,
    preset,
    include: includeNames,
    exclude: excludeNames,
    requireApproval: requireApproval as EveApprovalConfig | undefined,
    overrides: overrides as EveToolOverrides | undefined,
    context,
    author,
    committer,
    coAuthors,
  }
}

function approvalDisabled(
  writeTool: GithubWriteToolName | undefined,
  requireApproval: EveApprovalConfig | undefined,
  override: EveApprovalValue | undefined,
): boolean {
  if (override !== undefined) return isEveApprovalDisabled(override)
  if (!writeTool) return true
  if (requireApproval === false) return true
  if (typeof requireApproval === 'object' && requireApproval !== null) {
    return isEveApprovalDisabled(requireApproval[writeTool])
  }
  return false
}

function writeToolName(name: GithubToolName): GithubWriteToolName | undefined {
  if (!Object.hasOwn(GITHUB_WRITE_TOOLS, name)) return undefined
  return GITHUB_WRITE_TOOLS[name as keyof typeof GITHUB_WRITE_TOOLS]
}

function requireToolContext(ctx: ToolContext | undefined): ToolContext {
  if (!ctx) {
    throw new Error('connect.subject resolver needs the tool execution context — it is only available while a tool call executes')
  }
  return ctx
}

async function runGithubEveTool(name: GithubToolName, input: unknown, ctx: ToolContext) {
  return executeGithubEveTool(name, input as Record<string, unknown>, buildSessionOptions(ctx))
}

function runGithubEveToModelOutput(name: GithubToolName, output: unknown) {
  const custom = buildSessionOptions().overrides?.[name]?.toModelOutput
  return custom ? custom(output) : formatGithubEveToolOutput(name, output)
}

function runGithubEveApproval(name: GithubToolName, ctx: ApprovalContext) {
  const sessionOptions = buildSessionOptions()
  const override = sessionOptions.overrides?.[name]?.approval
  const writeTool = writeToolName(name)

  if (!writeTool || approvalDisabled(writeTool, sessionOptions.requireApproval, override)) {
    return 'not-applicable'
  }

  const policy = override !== undefined
    ? mapEveApprovalValue(override)
    : resolveEveApproval(writeTool, sessionOptions.requireApproval)

  return policy(ctx)
}

export default defineDynamic({
  events: {
    // Re-resolve each model step (not once per session) so tool registration
    // stays fresh across durable steps; execute still rebuilds options above.
    'step.started': async () => {
      const sessionOptions = buildSessionOptions()
      const descriptors = listEveToolDescriptors(sessionOptions)
      const tools: Record<string, ToolDefinition> = {}
      const toolOverrides = sessionOptions.overrides

      for (const entry of descriptors) {
        const name = entry.name
        const override = toolOverrides?.[name]

        tools[name] = defineTool({
          description: override?.description ?? entry.description,
          inputSchema: entry.inputSchema,
          approval: (ctx) => runGithubEveApproval(name, ctx),
          toModelOutput: (output: unknown) => runGithubEveToModelOutput(name, output),
          ...(override?.outputSchema !== undefined && {
            outputSchema: override.outputSchema,
          }),
          execute: async (input, ctx) => runGithubEveTool(name, input, ctx),
        })
      }

      return tools
    },
  },
})
