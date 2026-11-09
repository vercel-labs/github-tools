import { githubToolsErrors } from './errors'
import { guardrailViolation, type GithubGuardrails } from './guardrails'
import { githubTokenCall } from './token'
import type { GithubWriteToolName } from './write-tools'

/** What approval would have decided for a write, had it run for real. */
export type GithubDryRunApproval = {
  /** `true` when a person would have been asked to approve the call. */
  required: boolean
  /** The evaluation model's verdict, with `requireApproval: 'auto'`. */
  reason?: string
}

/** What a write tool returns under `dryRun`: nothing is sent to GitHub, and nobody is asked to approve it. */
export type GithubDryRunResult = {
  dryRun: true
  tool: GithubWriteToolName
  input: Record<string, unknown>
  /** What approval would have decided, when the integration can tell. */
  approval?: GithubDryRunApproval
  message: string
}

/**
 * The result of a write under `dryRun`. `guardrails` still apply, so a blocked write fails as it
 * would for real; the base branch of a merge is not checked, since that needs a request.
 * `approval` is only resolved for writes the guardrails allow.
 */
export async function dryRunWrite(
  name: GithubWriteToolName,
  input: Record<string, unknown>,
  guardrails?: GithubGuardrails,
  approval?: () => GithubDryRunApproval | undefined | Promise<GithubDryRunApproval | undefined>,
): Promise<GithubDryRunResult> {
  const reason = guardrailViolation(githubTokenCall(name, input), guardrails)
  if (reason) throw githubToolsErrors.GUARDRAIL_BLOCKED({ reason })
  const decision = await approval?.()
  const wouldApprove = decision === undefined
    ? ''
    : decision.required ? ' For real, it would have asked for approval.' : ' For real, it would have run without asking.'
  return {
    dryRun: true,
    tool: name,
    input,
    ...(decision && { approval: decision }),
    message: `Dry run: \`${name}\` was not sent to GitHub, so nothing changed.${wouldApprove} Tell the user what this call would have done.`,
  }
}
