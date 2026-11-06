import { connectGithubToken, resolveGithubConnector } from '@github-tools/sdk/connect'
import { connect } from '@vercel/connect/eve'
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
  type GithubTokenCall,
  type GithubToolName,
  type GithubWriteToolName,
} from '@github-tools/sdk/eve-runtime'
import type { ApprovalContext, ApprovalResponseContext, ApprovalResponseDecision } from 'eve/tools/approval'
import { defineDynamic, defineTool, type ToolContext, type ToolDefinition } from 'eve/tools'
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

function isUnauthorized(result: unknown): boolean {
  if (result == null || typeof result !== 'object' || !('error' in result)) return false
  const { error } = result
  return error != null && typeof error === 'object' && 'code' in error && error.code === githubToolsErrors.UNAUTHORIZED.code
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

type ApprovalTarget = GithubExtensionContext & { discussionNumber?: number }

function runGithubEveApprovalPrompt(name: GithubToolName, input: Record<string, unknown>) {
  const { owner, repo, pullNumber, issueNumber, discussionNumber } = { ...extension.config.context, ...input } as ApprovalTarget
  const action = name.replace(/[A-Z]/g, letter => ` ${letter.toLowerCase()}`)
  const number = pullNumber ?? issueNumber ?? discussionNumber
  const target = owner && repo ? ` on ${owner}/${repo}${number ? `#${number}` : ''}` : ''
  return `${action[0]!.toUpperCase()}${action.slice(1)}${target}?`
}

// eve runs this before every model call; `ctx.memo` keeps the `'auto'` preset
// routing fixed for the turn, across processes. With `'auto'`, the routed presets
// are listed and every other tool is deferred: the model finds it with `eve__search`.
export default defineDynamic(async (ctx) => {
  const sessionOptions = buildSessionOptions()
  const { preset, evaluation } = extension.config
  const history = await ctx.messages()
  const messages = withoutPendingApprovals(history)
  const request = latestUserText(messages)
  const listed = preset === 'auto'
    ? new Set(listEveToolDescriptors({
        ...sessionOptions,
        preset: await ctx.memo(['presets', ctx.turn?.id ?? null], () => selectPresets(messages, evaluation)),
        include: [...sessionOptions.include ?? [], ...calledGithubTools(history)],
      }).map(entry => entry.name))
    : undefined
  const descriptors = listEveToolDescriptors(listed ? { ...sessionOptions, preset: undefined, include: undefined } : sessionOptions)
  const tools: Record<string, ToolDefinition> = {}
  const toolOverrides = sessionOptions.overrides

  for (const entry of descriptors) {
    const name = entry.name
    const override = toolOverrides?.[name]

    tools[name] = defineTool({
      ...(listed && !listed.has(name) && { deferred: true }),
      description: override?.description ?? entry.description,
      inputSchema: entry.inputSchema,
      approval: {
        request: approvalCtx => runGithubEveApproval(name, request, approvalCtx),
        prompt: ({ input }) => runGithubEveApprovalPrompt(name, input),
        ...(extension.config.approvers === 'anyone' && {
          response: responseCtx => runGithubEveApprovalResponse(name, responseCtx),
        }),
      },
      toModelOutput: (output: unknown) => runGithubEveToModelOutput(name, output),
      ...(override?.outputSchema !== undefined && { outputSchema: override.outputSchema }),
      execute: async (input, toolCtx) => runGithubEveTool(name, input, toolCtx),
    })
  }

  return tools
})
