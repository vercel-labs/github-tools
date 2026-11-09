import type { ModelMessage } from 'ai'
import { assertEvaluationAvailable, autoApprovalDecision, evaluationRequest, type AutoApprovalDecision, type GithubEvaluationOptions } from './evaluation'
import type { GithubWriteToolName } from './write-tools'
import { resolveApprovalMode, type ApprovalConfig } from './approval-policy'
export { resolveApprovalMode } from './approval-policy'
export type { ApprovalConfig, StaticApprovalConfig, ToolApprovalMode } from './approval-policy'

const MAX_CACHED_DECISIONS = 100

/**
 * Resolve the AI SDK `needsApproval` value for a write tool.
 * `'auto'` becomes a function that evaluates each call with {@link needsAutoApproval}.
 * The AI SDK asks again once a person approves, so each decision is reused for the same
 * call, input and request (with the message it replies to) instead of calling the evaluation model twice.
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
    const key = JSON.stringify([toolCallId, input, evaluationRequest(messages)])
    const cached = decisions.get(key)
    if (cached) return cached
    const decision = autoApprovalDecision(toolName, input, messages, evaluation).then(({ ask }) => ask)
    decisions.set(key, decision)
    if (decisions.size > MAX_CACHED_DECISIONS) decisions.delete(decisions.keys().next().value!)
    return decision
  }
}

/**
 * Resolve the AI SDK `toolApproval` status for a write tool, for agents that use call-level
 * approval. `'auto'` explains its outcome: an approval request carries the decision model's verdict
 * as its reason, and a call it lets through is recorded as an automatic approval with that verdict.
 * Like {@link resolveAiSdkApproval}, each decision is reused for the same call, input and request.
 */
// The subset of AI SDK 7's `ToolApprovalStatus` this returns, declared here so `ai` 6 types still resolve.
export type GithubToolApprovalStatus = undefined | 'user-approval' | { type: 'user-approval' | 'approved', reason: string }

export function resolveAiSdkToolApproval(
  toolName: GithubWriteToolName,
  config: ApprovalConfig,
  evaluation?: GithubEvaluationOptions,
): (input: unknown, options: { toolCallId: string, messages: ModelMessage[] }) => Promise<GithubToolApprovalStatus> {
  const mode = resolveApprovalMode(toolName, config)
  if (mode !== 'auto') return async () => mode ? 'user-approval' : undefined
  assertEvaluationAvailable()
  const decisions = new Map<string, Promise<AutoApprovalDecision>>()
  return async (input, { toolCallId, messages }) => {
    const key = JSON.stringify([toolCallId, input, evaluationRequest(messages)])
    let decision = decisions.get(key)
    if (!decision) {
      decision = autoApprovalDecision(toolName, input, messages, evaluation)
      decisions.set(key, decision)
      if (decisions.size > MAX_CACHED_DECISIONS) decisions.delete(decisions.keys().next().value!)
    }
    const { ask, reason } = await decision
    return { type: ask ? 'user-approval' : 'approved', reason }
  }
}
