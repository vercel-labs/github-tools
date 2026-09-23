import type { ModelMessage } from 'ai'
import { AUTO_APPROVAL_TOOLS, needsAutoApproval, type GithubEvaluationOptions } from './evaluation'
import type { GithubWriteToolName } from './write-tools'

/**
 * Approval for a single write tool.
 *
 * - `true` — always ask the user
 * - `false` — never ask
 * - `'auto'` — ask only when an evaluation model (Jev by default) rates the call risky
 *   or not asked for by the latest user message. Needs `ai` 7.0.105 or later.
 */
export type ToolApprovalMode = boolean | 'auto'

/**
 * Whether write operations require user approval.
 *
 * - `true` — all write tools need approval (default)
 * - `false` — no approval needed for any write tool
 * - `'auto'` — low-risk write tools ({@link AUTO_APPROVAL_TOOLS}) are evaluated per call;
 *   every other write tool needs approval
 * - object — per-tool {@link ToolApprovalMode} via {@link GithubWriteToolName}; unspecified write tools default to `true`
 *
 * @example Global disable
 * ```ts
 * createGithubTools({ token, requireApproval: false })
 * ```
 *
 * @example Auto approval for low-risk writes
 * ```ts
 * createGithubTools({ token, requireApproval: 'auto' })
 * ```
 *
 * @example Granular per write tool
 * ```ts
 * createGithubTools({
 *   token,
 *   requireApproval: {
 *     mergePullRequest: true,
 *     createOrUpdateFile: true,
 *     addPullRequestComment: 'auto',
 *   },
 * })
 * ```
 */
export type ApprovalConfig = ToolApprovalMode | Partial<Record<GithubWriteToolName, ToolApprovalMode>>

/** {@link ApprovalConfig} without `'auto'`, for runtimes that cannot run the evaluation model. */
export type StaticApprovalConfig = boolean | Partial<Record<GithubWriteToolName, boolean>>

const autoApprovalTools: ReadonlySet<string> = new Set(AUTO_APPROVAL_TOOLS)

/**
 * Resolve a write tool's approval mode from global or per-tool config.
 *
 * @returns `'auto'` only for tools that opt into evaluation; defaults to `true` for unspecified tools in object mode.
 */
export function resolveApprovalMode(toolName: GithubWriteToolName, config: ApprovalConfig): ToolApprovalMode {
  if (config === 'auto') return autoApprovalTools.has(toolName) ? 'auto' : true
  if (typeof config === 'boolean') return config
  return config[toolName] ?? true
}

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
