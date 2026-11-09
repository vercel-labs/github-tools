import { connectGithubScopesForTools, connectGithubToken, resolveGithubConnector } from '@github-tools/sdk/connect'
import { connect } from '@vercel/connect/eve'
import {
  AUTO_APPROVAL_TOOLS,
  evaluatePresets,
  evaluateTools,
  executeGithubEveTool,
  fallbackPresets,
  fallbackTools,
  formatGithubEveToolOutput,
  githubToolsErrors,
  GITHUB_TOOL_NAMES,
  GITHUB_WRITE_TOOLS,
  isEveApprovalDisabled,
  latestUserText,
  listEveToolDescriptors,
  mapEveApprovalValue,
  needsAutoApproval,
  type EveGithubToolsOptions,
  type EveToolOverrides,
  type GithubTokenCall,
  type GithubToolName,
  type GithubWriteToolName,
} from '@github-tools/sdk/eve-runtime'
import type { ApprovalContext, ApprovalResponseContext, ApprovalResponseDecision, ApprovalResponsePolicy } from 'eve/tools/approval'
import { defineDynamic, defineTool, toolOutput, type ToolContext, type ToolDefinition } from 'eve/tools'
import { z } from 'zod'
import extension, {
  type GithubActAs,
  type GithubExtensionApprovalConfig,
  type GithubExtensionApprovalValue,
  type GithubExtensionContext,
} from '../extension'

/**
 * Rebuild options from extension config. `connect` resolvers need the tool
 * execution context, so `execute` passes it on every call.
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
  // context and tool call, so params resolve per tool call. With `preset: 'auto'`
  // the tool set changes per turn, so each token covers only the tool being called.
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
          return {
            ...(preset === 'auto' && call && { scopes: connectGithubScopesForTools([call.toolName]) }),
            ...params,
            ...(resolvedSubject && { subject: resolvedSubject }),
          }
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

type Principal = ApprovalResponseContext['response']['principal']

function actAsFor(name: GithubToolName): GithubActAs {
  const { actAs, overrides } = extension.config
  const override = overrides?.[name]?.actAs
  if (override) return override
  if (typeof actAs === 'object') return (writeToolName(name) ? actAs.write : actAs.read) ?? 'app'
  return actAs ?? 'app'
}

function isUser(principal: Principal | null | undefined): principal is Principal {
  return principal?.principalType === 'user'
}

function samePrincipal(a: Principal, b: Principal | null | undefined): boolean {
  return b != null
    && a.authenticator === b.authenticator
    && a.issuer === b.issuer
    && a.principalType === b.principalType
    && a.principalId === b.principalId
}

// eve resolves the signed-in user's token, asks them to authorize the GitHub
// App when they have not, and never hands one user's token to another.
async function githubUserAuth() {
  return connect(await resolveGithubConnector(extension.config.connector!))
}

async function runGithubEveTool(name: GithubToolName, input: unknown, ctx: ToolContext) {
  const args = input as Record<string, unknown>
  const actAs = actAsFor(name)
  if (actAs === 'app') return executeGithubEveTool(name, args, buildSessionOptions(ctx))

  const requester = ctx.session.auth.current
  const approver = ctx.approval?.responder
  const auth = await githubUserAuth()
  // Someone else approved: the call runs with their token, so GitHub checks and records the approver.
  if (isUser(approver) && !samePrincipal(approver, requester)) {
    const { token } = await approver.getToken(auth)
    return executeGithubEveTool(name, args, { ...buildSessionOptions(ctx), token })
  }
  if (actAs === 'caller' && !isUser(requester)) return executeGithubEveTool(name, args, buildSessionOptions(ctx))

  const { token } = await ctx.getToken(auth)
  const result = await executeGithubEveTool(name, args, { ...buildSessionOptions(ctx), token })
  // A 401 means the user revoked the authorization: drop the token and ask them to sign in again.
  if (isUnauthorized(result)) ctx.requireAuth(auth)
  return result
}

// Only set with `approvers: 'anyone'`: any signed-in user, or the requester, may approve. Without it, eve lets only the requester answer.
async function runGithubEveApprovalResponse(name: GithubToolName, { request, response, auth }: ApprovalResponseContext): Promise<ApprovalResponseDecision> {
  if (response.decision === 'deny') return { status: 'allowed' }
  if (!isUser(response.principal)) {
    return samePrincipal(response.principal, request.principal)
      ? { status: 'allowed' }
      : { status: 'rejected', reason: 'Sign in to approve this GitHub action.' }
  }
  if (actAsFor(name) === 'app') return { status: 'allowed' }
  // Signs the approver in before the approval counts, since the call will run with their token.
  await auth.getToken(await githubUserAuth())
  return { status: 'allowed' }
}

// A configured `response` policy decides who may answer; the extension's own checks still apply to whoever it allows.
async function runConfiguredApprovalResponse(name: GithubToolName, policy: ApprovalResponsePolicy, ctx: ApprovalResponseContext): Promise<ApprovalResponseDecision> {
  const decision = await policy(ctx)
  if (decision.status !== 'allowed') return decision
  return runGithubEveApprovalResponse(name, ctx)
}

function configuredApprovalResponse(name: GithubToolName): ApprovalResponsePolicy | undefined {
  const value = configuredApprovalValue(name)
  return typeof value === 'object' ? value.response : undefined
}

function isUnauthorized(result: unknown): boolean {
  if (!isErrorResult(result)) return false
  const { error } = result
  return typeof error === 'object' && error !== null && 'code' in error && error.code === githubToolsErrors.UNAUTHORIZED.code
}

function runGithubEveToModelOutput(name: GithubToolName, output: unknown) {
  const custom = buildSessionOptions().overrides?.[name]?.toModelOutput
  if (custom) return custom(output)
  // A failed call returns `{ error }`; marking it as an error result keeps providers and MCP clients from reading it as a success.
  if (isErrorResult(output)) return toolOutput.errorText(JSON.stringify({ error: output.error }))
  return formatGithubEveToolOutput(name, output)
}

function isErrorResult(output: unknown): output is { error: unknown } {
  return output != null && typeof output === 'object' && !Array.isArray(output) && 'error' in output && output.error != null
}

// Delegated and service sessions get their latest user message from another model or
// system, not from a person, so it cannot stand in for the person's request.
function isPersonRequest(ctx: ApprovalContext): boolean {
  return ctx.session.parent === undefined && ctx.session.auth.current?.principalType !== 'service'
}

// eve asks the request policy again once a person approves; reuse the first decision.
const autoDecisions = new Map<string, Promise<boolean>>()
const MAX_CACHED_DECISIONS = 100

function autoApprovalDecision(writeTool: GithubWriteToolName, request: string, ctx: ApprovalContext): Promise<boolean> {
  const key = `${ctx.session.id}:${ctx.callId}`
  const cached = autoDecisions.get(key)
  if (cached) return cached
  const messages: ModelMessage[] = [{ role: 'user', content: request }]
  const decision = needsAutoApproval(writeTool, ctx.toolInput, messages, extension.config.evaluation, ctx.abortSignal)
  autoDecisions.set(key, decision)
  decision.catch(() => autoDecisions.delete(key))
  if (autoDecisions.size > MAX_CACHED_DECISIONS) autoDecisions.delete(autoDecisions.keys().next().value!)
  return decision
}

function configuredApprovalValue(name: GithubToolName): GithubExtensionApprovalValue | undefined {
  const writeTool = writeToolName(name)
  if (!writeTool) return undefined
  const { requireApproval, overrides } = extension.config
  return approvalValue(writeTool, requireApproval, overrides?.[name]?.approval)
}

async function runGithubEveApproval(name: GithubToolName, request: string, ctx: ApprovalContext) {
  const writeTool = writeToolName(name)
  if (!writeTool) return 'not-applicable'

  const value = configuredApprovalValue(name)!
  if (value === 'auto') {
    if (!isPersonRequest(ctx)) return 'user-approval'
    return await autoApprovalDecision(writeTool, request, ctx) ? 'user-approval' : 'not-applicable'
  }
  if (isEveApprovalDisabled(value)) return 'not-applicable'
  return mapEveApprovalValue(value)(ctx)
}

type ApprovalTarget = GithubExtensionContext & { discussionNumber?: number }

// "Create issue on owner/repo#12": the channel label while a call runs, and the approval prompt.
// Context defaults only count for fields the tool takes, so the prompt names the target the call acts on.
function describeGithubCall(name: GithubToolName, inputSchema: z.ZodType, input: Readonly<Record<string, unknown>>) {
  const fields = inputSchema instanceof z.ZodObject ? inputSchema.shape : {}
  const context = Object.fromEntries(Object.entries(extension.config.context ?? {}).filter(([key]) => key in fields))
  const { owner, repo, pullNumber, issueNumber, discussionNumber } = { ...context, ...input } as ApprovalTarget
  const action = name.replace(/[A-Z]/g, letter => ` ${letter.toLowerCase()}`)
  const number = pullNumber ?? issueNumber ?? discussionNumber
  const target = owner && repo ? ` on ${owner}/${repo}${number ? `#${number}` : ''}` : ''
  return `${action[0]!.toUpperCase()}${action.slice(1)}${target}`
}

// eve runs this before every model call; `ctx.memo` keeps the `'auto'` routing fixed
// for the session or the turn, across processes. With `'auto'`, the picked tools (or, with
// `evaluation.selection: 'presets'`, the routed presets) are listed and every other tool
// is deferred: the model finds it with `eve__search`.
export default defineDynamic(async (ctx) => {
  const sessionOptions = buildSessionOptions()
  const { preset, evaluation } = extension.config
  const messages = await ctx.messages()
  const request = latestUserText(messages)
  // A failed memo keeps no result, so the next model call retries routing instead of staying on the fallback.
  // Memos are per session, so `scope: 'session'` keeps the first turn's routing for the whole session.
  const routingKey = evaluation?.scope === 'turn' ? ctx.turn?.id ?? null : null
  const routed = preset !== 'auto'
    ? undefined
    : evaluation?.selection !== 'presets'
      ? { include: await ctx.memo(['tools', routingKey], ({ abortSignal }) => evaluateTools(messages, evaluation, abortSignal))
          .catch((error: unknown) => fallbackTools(error, evaluation)) }
      : { preset: await ctx.memo(['presets', routingKey], ({ abortSignal }) => evaluatePresets(messages, evaluation, abortSignal))
          .catch((error: unknown) => fallbackPresets(error, evaluation)) }
  const listed = routed && new Set(listEveToolDescriptors({
    ...sessionOptions,
    preset: routed.preset,
    include: [...routed.include ?? [], ...sessionOptions.include ?? [], ...calledGithubTools(messages)],
  }).map(entry => entry.name))
  const descriptors = listEveToolDescriptors(listed ? { ...sessionOptions, preset: undefined, include: undefined } : sessionOptions)
  const tools: Record<string, ToolDefinition> = {}
  const toolOverrides = sessionOptions.overrides

  for (const entry of descriptors) {
    const name = entry.name
    const override = toolOverrides?.[name]
    const configuredResponse = configuredApprovalResponse(name)

    tools[name] = defineTool({
      ...(listed && !listed.has(name) && { deferred: true }),
      description: override?.description ?? entry.description,
      inputSchema: entry.inputSchema,
      approval: {
        request: approvalCtx => runGithubEveApproval(name, request, approvalCtx),
        prompt: ({ input }) => `${describeGithubCall(name, entry.inputSchema, input)}?`,
        ...(configuredResponse
          ? { response: responseCtx => runConfiguredApprovalResponse(name, configuredResponse, responseCtx) }
          : extension.config.approvers === 'anyone' && {
            response: responseCtx => runGithubEveApprovalResponse(name, responseCtx),
          }),
      },
      label: { start: input => describeGithubCall(name, entry.inputSchema, input as Record<string, unknown>) },
      toModelOutput: (output: unknown) => runGithubEveToModelOutput(name, output),
      ...(override?.outputSchema !== undefined && { outputSchema: override.outputSchema }),
      execute: async (input, toolCtx) => runGithubEveTool(name, input, toolCtx),
    })
  }

  return tools
})
