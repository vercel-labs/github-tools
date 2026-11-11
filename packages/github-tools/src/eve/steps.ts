import { mergeContextArgs } from '../core/context'
import { EvlogError, githubToolsErrors, toModelErrorPayload } from '../core/errors'
import { guardrailViolation } from '../core/guardrails'
import { dryRunWrite } from '../core/dry-run'
import { isGithubWriteToolName } from '../core/catalog'
import { githubTokenCall, resolveGithubToken } from '../core/token'
import { ALL_GITHUB_TOOL_NAMES, createToolRegistry, type GithubToolName, type ToolBuildContext } from './registry'

async function executeGithubToolStep(
  name: GithubToolName,
  input: Record<string, unknown>,
  ctx: ToolBuildContext,
) {
  'use step'
  const [entry] = createToolRegistry(ctx, ALL_GITHUB_TOOL_NAMES.filter(tool => tool === name))
  if (!entry) {
    throw new Error(`Unknown GitHub tool: ${name}`)
  }
  return entry.execute(input)
}

/** Why `guardrails` block a call once `context` defaults are applied, or `undefined` when they allow it. */
export function githubGuardrailViolation(
  name: GithubToolName,
  input: Record<string, unknown>,
  { context, guardrails }: Pick<ToolBuildContext, 'context' | 'guardrails'>,
) {
  return guardrailViolation(githubTokenCall(name, mergeContextArgs(input, context ?? {})), guardrails)
}

function isErrorResult(result: unknown): result is { error: string } {
  return typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
}

// An Octokit error holds the request's URL, headers, and body, and its response.
function withoutRequest(error: unknown) {
  if (!(error instanceof Error) || !('request' in error || 'response' in error)) return error
  const reduced = new Error(error.message)
  reduced.name = error.name
  return reduced
}

export async function runGithubToolStep(
  name: GithubToolName,
  input: Record<string, unknown>,
  ctx: ToolBuildContext,
) {
  try {
    // Resolve the token before entering the step so only a serializable string crosses the boundary.
    const call = githubTokenCall(name, mergeContextArgs(input, ctx.context ?? {}))
    const reason = guardrailViolation(call, ctx.guardrails)
    if (reason) throw githubToolsErrors.GUARDRAIL_BLOCKED({ reason })
    if (ctx.dryRun && isGithubWriteToolName(name)) return dryRunWrite(name, call.input as Record<string, unknown>, ctx.guardrails, () => ctx.dryRunApproval)
    const token = await resolveGithubToken(ctx.token, call)
    const result = await executeGithubToolStep(name, input, { ...ctx, token })
    // Some GraphQL tools return `{ error }` when GitHub has no such repository, thread, or discussion.
    if (isErrorResult(result)) throw new Error(result.error)
    return result
  } catch (error) {
    // eve gives the model a thrown error's message, and reads `code` and `message` from it for `call.settled`.
    // A catalog error's message is its { code, message, why, fix, link } so the model can recover.
    // eve also logs the error with its cause chain, so what is thrown holds nothing from the GitHub request.
    if (EvlogError.isEvlogError(error)) throw new Error(JSON.stringify(toModelErrorPayload(error)), { cause: { code: error.code, status: error.status } })
    throw withoutRequest(error)
  }
}
