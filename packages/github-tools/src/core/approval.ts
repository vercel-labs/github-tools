import type { ModelMessage } from 'ai'
import { assertEvaluationAvailable, latestUserText, needsAutoApproval, type GithubEvaluationOptions } from './evaluation'
import type { GithubWriteToolName } from './write-tools'
import { resolveApprovalMode, type ApprovalConfig } from './approval-policy'
export { resolveApprovalMode } from './approval-policy'
export type { ApprovalConfig, StaticApprovalConfig, ToolApprovalMode } from './approval-policy'

const MAX_CACHED_DECISIONS = 100

/**
 * Resolve the AI SDK `needsApproval` value for a write tool.
 * `'auto'` becomes a function that evaluates each call with {@link needsAutoApproval}.
 * The AI SDK asks again once a person approves, so each decision is reused for the same
 * call, input and request instead of calling the evaluation model twice.
 */
export function resolveAiSdkApproval(
  toolName: GithubWriteToolName,
  config: ApprovalConfig,
  evaluation?: GithubEvaluationOptions,
): boolean | ((input: unknown, options: { toolCallId: string, messages: ModelMessage[] }) => Promise<boolean>) {
  const mode = resolveApprovalMode(toolName, config)
  if (mode !== 'auto') return mode
  assertEvaluationAvailable()
  const decisions = new Map<string, Promise<boolean>>()
  return (input, { toolCallId, messages }) => {
    const key = JSON.stringify([toolCallId, input, latestUserText(messages)])
    const cached = decisions.get(key)
    if (cached) return cached
    const decision = needsAutoApproval(toolName, input, messages, evaluation)
    decisions.set(key, decision)
    if (decisions.size > MAX_CACHED_DECISIONS) decisions.delete(decisions.keys().next().value!)
    return decision
  }
}
