import { connectGithubScopesForTools, connectGithubToken, resolveGithubConnector } from '@github-tools/sdk/connect'
import { connect } from '@vercel/connect/eve'
import {
  AUTO_APPROVAL_TOOLS,
  autoApprovalDecision,
  evaluatePresets,
  evaluateTools,
  executeGithubEveTool,
  githubGuardrailViolation,
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
  type AutoApprovalDecision,
  type EveGithubToolsOptions,
  type EveToolOverrides,
  type GithubTokenCall,
  type GithubToolName,
  type GithubWriteToolName,
} from '@github-tools/sdk/eve-runtime'
import type { ApprovalContext, ApprovalResponseContext, ApprovalResponseDecision, ApprovalResponsePolicy, ApprovalStatus } from 'eve/tools/approval'
import { defineDynamic, defineTool, toolOutput, type ToolContext, type ToolDefinition } from 'eve/tools'
import { z } from 'zod'
import { sessionContext } from '../lib/context'
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
function buildSessionOptions(ctx?: ToolContext, auth = ctx?.session.auth.current): EveGithubToolsOptions {
  const {
    token,
    connector,
    connect,
    preset,
    include,
    exclude,
    overrides,
    author,
    committer,
    coAuthors,
    guardrails,
  } = extension.config
  const context = sessionContext(auth)

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
    guardrails,
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
// The approval prompt callback is synchronous, so it reads `settled`.
type CachedDecision = { pending: Promise<AutoApprovalDecision>, settled?: AutoApprovalDecision }
const autoDecisions = new Map<string, CachedDecision>()
const MAX_CACHED_DECISIONS = 100

function decisionKey(sessionId: string, callId: string) {
  return `${sessionId}:${callId}`
}

function cachedAutoApproval(writeTool: GithubWriteToolName, request: string, ctx: ApprovalContext): Promise<AutoApprovalDecision> {
  const key = decisionKey(ctx.session.id, ctx.callId)
  const cached = autoDecisions.get(key)
  if (cached) return cached.pending
  const messages: ModelMessage[] = [{ role: 'user', content: request }]
  const entry: CachedDecision = {
    pending: autoApprovalDecision(writeTool, ctx.toolInput, messages, extension.config.evaluation, ctx.abortSignal)
      .then((decision) => {
        entry.settled = decision
        return decision
      }),
  }
  autoDecisions.set(key, entry)
  entry.pending.catch(() => autoDecisions.delete(key))
  if (autoDecisions.size > MAX_CACHED_DECISIONS) autoDecisions.delete(autoDecisions.keys().next().value!)
  return entry.pending
}

// "Add labels on owner/repo#12? Hard to undo (risk 2 of 2), 100% likely you asked for it."
// An `agent.ts` policy can still ask for a call the evaluator approved; that prompt gets no reason.
function approvalPrompt(label: string, sessionId: string, callId: string) {
  const decision = autoDecisions.get(decisionKey(sessionId, callId))?.settled
  return decision?.ask ? `${label}? ${decision.reason}` : `${label}?`
}

function configuredApprovalValue(name: GithubToolName): GithubExtensionApprovalValue | undefined {
  const writeTool = writeToolName(name)
  if (!writeTool) return undefined
  const { requireApproval, overrides } = extension.config
  return approvalValue(writeTool, requireApproval, overrides?.[name]?.approval)
}

async function runGithubEveApproval(name: GithubToolName, request: string, ctx: ApprovalContext): Promise<ApprovalStatus> {
  const writeTool = writeToolName(name)
  if (!writeTool) return 'not-applicable'
  const reason = githubGuardrailViolation(name, ctx.toolInput as Record<string, unknown>, { context: sessionContext(ctx.session.auth.current), guardrails: extension.config.guardrails })
  if (reason) return { type: 'denied', reason }

  const value = configuredApprovalValue(name)!
  if (value === 'auto') {
    if (!isPersonRequest(ctx)) return 'user-approval'
    // `'approved'` records `clearedBy: { policy: 'approval' }` on `call.started`, unlike a call that needed no approval.
    const { ask, reason } = await cachedAutoApproval(writeTool, request, ctx)
    return ask ? 'user-approval' : { type: 'approved', reason }
  }
  if (isEveApprovalDisabled(value)) return 'not-applicable'
  return mapEveApprovalValue(value)(ctx)
}

type ApprovalTarget = GithubExtensionContext & { discussionNumber?: number }

// "Create issue on owner/repo#12": the channel label while a call runs, and the approval prompt.
// Context defaults only count for fields the tool takes, so the prompt names the target the call acts on.
function describeGithubCall(name: GithubToolName, inputSchema: z.ZodType, input: Readonly<Record<string, unknown>>, sessionContext: GithubExtensionContext | undefined) {
  const fields = inputSchema instanceof z.ZodObject ? inputSchema.shape : {}
  const context = Object.fromEntries(Object.entries(sessionContext ?? {}).filter(([key]) => key in fields))
  const { owner, repo, pullNumber, issueNumber, discussionNumber } = { ...context, ...input } as ApprovalTarget
  const action = name.replace(/[A-Z]/g, letter => ` ${letter.toLowerCase()}`)
  const number = pullNumber ?? issueNumber ?? discussionNumber
  const target = owner && repo ? ` on ${owner}/${repo}${number ? `#${number}` : ''}` : ''
  return `${action[0]!.toUpperCase()}${action.slice(1)}${target}`
}

const PAST_TENSE: Record<string, string> = {
  add: 'Added', cancel: 'Cancelled', close: 'Closed', create: 'Created', delete: 'Deleted', disable: 'Disabled',
  edit: 'Edited', enable: 'Enabled', fork: 'Forked',
  mark: 'Marked', merge: 'Merged', remove: 'Removed', reply: 'Replied', request: 'Requested', rerun: 'Reran',
  resolve: 'Resolved', trigger: 'Triggered', update: 'Updated',
}

// "Created issue on owner/repo#123" once a write succeeds, with the number of what it created.
// Reads return '', which keeps their start label. A failed call returns `{ error }` rather than
// throwing, so eve runs this for it too: "Couldn't create issue on owner/repo".
function describeGithubResult(name: GithubToolName, inputSchema: z.ZodType, input: Readonly<Record<string, unknown>>, output: unknown, context: GithubExtensionContext | undefined) {
  if (output !== null && typeof output === 'object' && 'error' in output) {
    const label = describeGithubCall(name, inputSchema, input, context)
    return `Couldn't ${label[0]!.toLowerCase()}${label.slice(1)}`
  }
  if (!writeToolName(name)) return ''
  const created = output !== null && typeof output === 'object' && 'number' in output && typeof output.number === 'number' ? output.number : undefined
  const target = created !== undefined && input.pullNumber === undefined && input.issueNumber === undefined && input.discussionNumber === undefined
    ? { ...input, issueNumber: created }
    : input
  const [verb, ...rest] = describeGithubCall(name, inputSchema, target, context).split(' ')
  const past = PAST_TENSE[verb!.toLowerCase()]
  return past ? [past, ...rest].join(' ') : ''
}

// eve runs this before every model call; `ctx.memo` keeps the `'auto'` routing fixed
// for the session or the turn, across processes. With `'auto'`, the picked tools (or, with
// `evaluation.selection: 'presets'`, the routed presets) are listed and every other tool
// is deferred: the model finds it with `eve__search`.
export default defineDynamic(async (ctx) => {
  const sessionOptions = buildSessionOptions(undefined, ctx.session.auth.current)
  const { context } = sessionOptions
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
        prompt: ({ callId, input }) => approvalPrompt(describeGithubCall(name, entry.inputSchema, input, context), ctx.session.id, callId),
        ...(configuredResponse
          ? { response: responseCtx => runConfiguredApprovalResponse(name, configuredResponse, responseCtx) }
          : extension.config.approvers === 'anyone' && {
            response: responseCtx => runGithubEveApprovalResponse(name, responseCtx),
          }),
      },
      label: {
        start: input => describeGithubCall(name, entry.inputSchema, input as Record<string, unknown>, context),
        complete: (input, output) => describeGithubResult(name, entry.inputSchema, input as Record<string, unknown>, output, context),
      },
      toModelOutput: (output: unknown) => runGithubEveToModelOutput(name, output),
      ...(override?.outputSchema !== undefined && { outputSchema: override.outputSchema }),
      execute: async (input, toolCtx) => runGithubEveTool(name, input, toolCtx),
    })
  }

  return tools
})
