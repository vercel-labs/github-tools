import { githubToolsErrors } from './errors'
import { guardrailViolation, type GithubGuardrails } from './guardrails'
import { githubTokenCall } from './token'
import type { GithubWriteToolName } from './write-tools'

/** What a write tool returns under `dryRun`: nothing is sent to GitHub. */
export type GithubDryRunResult = {
  dryRun: true
  tool: GithubWriteToolName
  input: Record<string, unknown>
  message: string
}

/**
 * The result of a write under `dryRun`. `guardrails` still apply, so a blocked write fails as it
 * would for real; the base branch of a merge is not checked, since that needs a request.
 */
export function dryRunWrite(name: GithubWriteToolName, input: Record<string, unknown>, guardrails?: GithubGuardrails): GithubDryRunResult {
  const reason = guardrailViolation(githubTokenCall(name, input), guardrails)
  if (reason) throw githubToolsErrors.GUARDRAIL_BLOCKED({ reason })
  return {
    dryRun: true,
    tool: name,
    input,
    message: `Dry run: \`${name}\` was not sent to GitHub, so nothing changed. Tell the user what this call would have done.`,
  }
}
