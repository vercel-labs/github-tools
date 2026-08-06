import { connectGithubToken } from '@github-tools/sdk/connect'
import {
  executeGithubEveTool,
  listEveToolDescriptors,
  mapEveApprovalValue,
  resolveEveApproval,
  type EveApprovalConfig,
  type EveGithubToolsOptions,
  type EveToolOverrides,
  type GithubToolName,
} from '@github-tools/sdk/eve'
import { defineDynamic, defineTool, type ToolDefinition } from 'eve/tools'
import extension from '../extension'

/**
 * Session options stored at module level so durable `execute` closures only capture
 * a serializable tool `name` (see https://github.com/vercel-labs/github-tools/issues/51).
 */
let sessionOptions: EveGithubToolsOptions = {}

async function runGithubEveTool(name: GithubToolName, input: unknown) {
  return executeGithubEveTool(name, input as Record<string, unknown>, sessionOptions)
}

export default defineDynamic({
  events: {
    'session.started': async () => {
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

      const resolvedToken = connector
        ? connectGithubToken(connector, { preset, params: connect })
        : token

      sessionOptions = {
        token: resolvedToken,
        preset,
        include: include as GithubToolName[] | undefined,
        exclude: exclude as GithubToolName[] | undefined,
        requireApproval: requireApproval as EveApprovalConfig | undefined,
        overrides: overrides as EveToolOverrides | undefined,
        context,
        author,
        committer,
        coAuthors,
      }

      const descriptors = listEveToolDescriptors(sessionOptions)
      const tools: Record<string, ToolDefinition> = {}
      const toolOverrides = sessionOptions.overrides

      for (const entry of descriptors) {
        const name = entry.name
        const override = toolOverrides?.[name]

        tools[name] = defineTool({
          description: override?.description ?? entry.description,
          inputSchema: entry.inputSchema,
          ...(entry.writeTool && {
            approval: resolveEveApproval(entry.writeTool, sessionOptions.requireApproval),
          }),
          ...(override?.approval !== undefined && {
            approval: mapEveApprovalValue(override.approval),
          }),
          ...(override?.toModelOutput !== undefined
            ? { toModelOutput: override.toModelOutput }
            : entry.toModelOutput ? { toModelOutput: entry.toModelOutput } : {}),
          execute: async (input) => runGithubEveTool(name, input),
        })
      }

      return tools
    },
  },
})
