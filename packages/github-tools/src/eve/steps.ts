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
    if (ctx.dryRun && isGithubWriteToolName(name)) return dryRunWrite(name, call.input as Record<string, unknown>, ctx.guardrails)
    const token = await resolveGithubToken(ctx.token, call)
    return await executeGithubToolStep(name, input, { ...ctx, token })
  } catch (error) {
    // Eve's tool-loop logs thrown execute errors but does not always append a
    // tool_result. Returning a payload keeps the Anthropic tool_use/tool_result pairing intact.
    // Catalog errors keep their { code, why, fix, link } structure so the model can recover.
    if (EvlogError.isEvlogError(error)) {
      return { error: toModelErrorPayload(error) }
    }
    return { error: error instanceof Error ? error.message : String(error) }
  }
}
