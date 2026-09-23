import { connectGithubToken } from '@github-tools/sdk/connect'
import {
  AUTO_APPROVAL_TOOLS,
  executeGithubEveTool,
  formatGithubEveToolOutput,
  githubToolsErrors,
  GITHUB_TOOL_NAMES,
  GITHUB_WRITE_TOOLS,
  isEveApprovalDisabled,
  latestUserText,
  listEveToolDescriptors,
  mapEveApprovalValue,
  needsAutoApproval,
  selectPresets,
  type EveGithubToolsOptions,
  type EveToolOverrides,
  type GithubEvaluationOptions,
  type GithubTokenCall,
  type GithubToolName,
  type GithubToolPreset,
  type GithubWriteToolName,
} from '@github-tools/sdk/eve-runtime'
import type { ApprovalContext } from 'eve/tools/approval'
import { defineDurableSchema, defineDynamic, defineTool, type ToolContext, type ToolDefinition } from 'eve/tools'
import extension, { type GithubExtensionApprovalConfig, type GithubExtensionApprovalValue } from '../extension'

/**
 * Rebuild options from extension config on every call.
 * Durable callbacks and schemas only close over a serializable tool `name`
 * (#51, #99). Callbacks must be direct `defineTool` properties, while live
 * schemas use `defineDurableSchema`; eve rejects either without a descriptor.
 */
function buildSessionOptions(ctx?: ToolContext): EveGithubToolsOptions {
  const {
    token,
    connector,
    connect,
    preset,
    include,
    exclude,
    overrides,
    context,
    author,
    committer,
    coAuthors,
  } = extension.config

  const includeNames = include as GithubToolName[] | undefined
  const excludeNames = exclude as GithubToolName[] | undefined

  // `connect` and `connect.subject` may be resolvers over the execution
  // context and tool call, so params resolve per tool call.
  const resolvedToken = connector
    ? connectGithubToken(connector, {
        preset: preset === 'auto' ? undefined : preset,
        include: includeNames,
        exclude: excludeNames,
        params: async (call) => {
          const { subject, ...params } = typeof connect === 'function'
            ? await connect(requireToolContext(ctx), requireToolCall(call))
            : connect ?? {}
          const resolvedSubject = typeof subject === 'function'
            ? await subject(requireToolContext(ctx))
            : subject
          return { ...params, ...(resolvedSubject && { subject: resolvedSubject }) }
        },
      })
    : token

  return {
    token: resolvedToken,
    preset: preset === 'auto' ? undefined : preset,
    include: includeNames,
    exclude: excludeNames,
    overrides: overrides as EveToolOverrides | undefined,
    context,
    author,
    committer,
    coAuthors,
  }
}

type ModelMessage = Parameters<typeof latestUserText>[0][number]

const autoApprovalTools = new Set<GithubWriteToolName>(AUTO_APPROVAL_TOOLS)

function approvalValue(
  writeTool: GithubWriteToolName,
  requireApproval: GithubExtensionApprovalConfig | undefined,
  override: GithubExtensionApprovalValue | undefined,
): GithubExtensionApprovalValue {
  if (override !== undefined) return override
  if (requireApproval === 'auto') return autoApprovalTools.has(writeTool) ? 'auto' : true
  if (typeof requireApproval === 'object') return requireApproval[writeTool] ?? true
  return requireApproval ?? true
}

// eve resumes an approval batch with a user message starting with this label; it is not a user request.
const PENDING_APPROVALS_LABEL = '[Pending approvals]'

function withoutPendingApprovals(messages: readonly ModelMessage[]): ModelMessage[] {
  return messages.filter(m => m.role !== 'user' || !latestUserText([m]).startsWith(PENDING_APPROVALS_LABEL))
}

// `step.started` runs on every model step; route once per user message.
const routedPresets = new Map<string, Promise<GithubToolPreset[]>>()

function routePresets(sessionId: string, messages: readonly ModelMessage[], evaluation: GithubEvaluationOptions | undefined) {
  const key = `${sessionId}:${messages.filter(m => m.role === 'user').length}`
  let presets = routedPresets.get(key)
  if (!presets) {
    presets = selectPresets(messages, evaluation)
    presets.catch(() => routedPresets.delete(key))
    routedPresets.set(key, presets)
    if (routedPresets.size > 1000) routedPresets.delete(routedPresets.keys().next().value!)
  }
  return presets
}

// A parked call replayed in a new process must find its tool even if routing picks other presets.
function calledGithubTools(messages: readonly ModelMessage[]): GithubToolName[] {
  return messages.flatMap(message => message.role === 'assistant' && Array.isArray(message.content)
    ? message.content.flatMap((part) => {
        if (part.type !== 'tool-call') return []
        const name = part.toolName.split('__').at(-1)!
        return Object.hasOwn(GITHUB_TOOL_NAMES, name) ? [name as GithubToolName] : []
      })
    : [])
}

function writeToolName(name: GithubToolName): GithubWriteToolName | undefined {
  if (!Object.hasOwn(GITHUB_WRITE_TOOLS, name)) return undefined
  return GITHUB_WRITE_TOOLS[name as keyof typeof GITHUB_WRITE_TOOLS]
}

function requireToolContext(ctx: ToolContext | undefined): ToolContext {
  if (!ctx) {
    throw githubToolsErrors.SUBJECT_CONTEXT_REQUIRED()
  }
  return ctx
}

function requireToolCall(call: GithubTokenCall | undefined): GithubTokenCall {
  if (!call) {
    throw githubToolsErrors.SUBJECT_CONTEXT_REQUIRED()
  }
  return call
}

async function runGithubEveTool(name: GithubToolName, input: unknown, ctx: ToolContext) {
  return executeGithubEveTool(name, input as Record<string, unknown>, buildSessionOptions(ctx))
}

function runGithubEveToModelOutput(name: GithubToolName, output: unknown) {
  const custom = buildSessionOptions().overrides?.[name]?.toModelOutput
  return custom ? custom(output) : formatGithubEveToolOutput(name, output)
}

async function runGithubEveApproval(name: GithubToolName, request: string, ctx: ApprovalContext) {
  const writeTool = writeToolName(name)
  if (!writeTool) return 'not-applicable'

  const { requireApproval, overrides, evaluation } = extension.config
  const value = approvalValue(writeTool, requireApproval, overrides?.[name]?.approval)
  if (value === 'auto') {
    const messages: ModelMessage[] = [{ role: 'user', content: request }]
    return await needsAutoApproval(writeTool, ctx.toolInput, messages, evaluation) ? 'user-approval' : 'not-applicable'
  }
  if (isEveApprovalDisabled(value)) return 'not-applicable'
  return mapEveApprovalValue(value)(ctx)
}

function buildGithubEveInputSchema({ name }: { name: GithubToolName }) {
  const descriptor = listEveToolDescriptors({
    ...buildSessionOptions(),
    preset: undefined,
    include: [name],
    exclude: undefined,
  })[0]
  if (!descriptor) {
    throw new Error(`GitHub tool descriptor "${name}" is not available`)
  }
  return descriptor.inputSchema
}

function buildGithubEveOutputSchema({ name }: { name: GithubToolName }) {
  const outputSchema = buildSessionOptions().overrides?.[name]?.outputSchema
  if (!outputSchema) {
    throw new Error(`GitHub tool output schema override "${name}" is not available`)
  }
  return outputSchema
}

export default defineDynamic({
  events: {
    // Re-resolve each model step (not once per session) so tool registration
    // stays fresh across durable steps; execute still rebuilds options above.
    'step.started': async (_event, ctx) => {
      const sessionOptions = buildSessionOptions()
      const { preset, evaluation } = extension.config
      const messages = withoutPendingApprovals(ctx.messages)
      const request = latestUserText(messages)
      const descriptors = listEveToolDescriptors(preset === 'auto'
        ? {
            ...sessionOptions,
            preset: await routePresets(ctx.session.id, messages, evaluation),
            include: [...sessionOptions.include ?? [], ...calledGithubTools(ctx.messages)],
          }
        : sessionOptions)
      const tools: Record<string, ToolDefinition> = {}
      const toolOverrides = sessionOptions.overrides

      for (const entry of descriptors) {
        const name = entry.name
        const override = toolOverrides?.[name]

        tools[name] = defineTool({
          description: override?.description ?? entry.description,
          inputSchema: defineDurableSchema({
            closure: { name },
            schema: buildGithubEveInputSchema,
          }),
          approval: (approvalCtx) => runGithubEveApproval(name, request, approvalCtx),
          toModelOutput: (output: unknown) => runGithubEveToModelOutput(name, output),
          ...(override?.outputSchema !== undefined && {
            outputSchema: defineDurableSchema({
              closure: { name },
              schema: buildGithubEveOutputSchema,
            }),
          }),
          execute: async (input, ctx) => runGithubEveTool(name, input, ctx),
        })
      }

      return tools
    },
  },
})
