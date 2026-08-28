import { connectGithubToken } from '@github-tools/sdk/connect'
import {
  executeGithubEveTool,
  formatGithubEveToolOutput,
  isEveApprovalDisabled,
  listEveToolDescriptors,
  mapEveApprovalValue,
  resolveEveApproval,
  type EveApprovalConfig,
  type EveApprovalValue,
  type EveGithubToolsOptions,
  type EveToolOverrides,
  type GithubToolName,
  type GithubWriteToolName,
} from '@github-tools/sdk/eve-runtime'
import { defineDynamic, defineTool, type ToolDefinition } from 'eve/tools'
import extension from '../extension'

/**
 * Rebuild options from extension config on every call.
 * Durable `execute` / `toModelOutput` only close over a serializable tool `name`
 * (#51, #99). `toModelOutput` must be a direct `defineTool` property — a spread
 * ternary is invisible to eve's stamp, and 0.44+ then drops the whole toolset.
 */
function buildSessionOptions(): EveGithubToolsOptions {
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

  const resolvedToken = connector
    ? connectGithubToken(connector, {
        preset,
        include: includeNames,
        exclude: excludeNames,
        params: connect,
      })
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

async function runGithubEveTool(name: GithubToolName, input: unknown) {
  return executeGithubEveTool(name, input as Record<string, unknown>, buildSessionOptions())
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
        const skipApproval = approvalDisabled(
          entry.writeTool,
          sessionOptions.requireApproval,
          override?.approval,
        )

        tools[name] = defineTool({
          description: override?.description ?? entry.description,
          inputSchema: entry.inputSchema,
          ...(entry.writeTool && !skipApproval && {
            approval: resolveEveApproval(entry.writeTool, sessionOptions.requireApproval),
          }),
          ...(override?.approval !== undefined && !skipApproval && {
            approval: mapEveApprovalValue(override.approval),
          }),
          toModelOutput: (output: unknown) => {
            const custom = buildSessionOptions().overrides?.[name]?.toModelOutput
            return custom ? custom(output) : formatGithubEveToolOutput(name, output)
          },
          ...(override?.outputSchema !== undefined && {
            outputSchema: override.outputSchema,
          }),
          execute: async (input) => runGithubEveTool(name, input),
        })
      }

      return tools
    },
  },
})
