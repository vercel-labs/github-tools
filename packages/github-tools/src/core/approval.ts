import type { ModelMessage } from 'ai'
import { needsAutoApproval, type GithubEvaluationOptions } from './evaluation'
import type { GithubWriteToolName } from './write-tools'
import { resolveApprovalMode, type ApprovalConfig } from './approval-policy'
export { resolveApprovalMode } from './approval-policy'
export type { ApprovalConfig, StaticApprovalConfig, ToolApprovalMode } from './approval-policy'

/**
 * Resolve the AI SDK `needsApproval` value for a write tool.
 * `'auto'` becomes a function that evaluates each call with {@link needsAutoApproval}.
 */
export function resolveAiSdkApproval(
  toolName: GithubWriteToolName,
  config: ApprovalConfig,
  evaluation?: GithubEvaluationOptions,
): boolean | ((input: unknown, options: { messages: ModelMessage[] }) => Promise<boolean>) {
  const mode = resolveApprovalMode(toolName, config)
  if (mode !== 'auto') return mode
  return (input, { messages }) => needsAutoApproval(toolName, input, messages, evaluation)
}
