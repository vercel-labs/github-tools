import type { GithubWriteToolName } from './write-tools'

/**
 * Whether write operations require user approval.
 *
 * - `true` — all write tools need approval (default)
 * - `false` — no approval needed for any write tool
 * - object — per-tool override via {@link GithubWriteToolName}; unspecified write tools default to `true`
 *
 * @example Global disable
 * ```ts
 * createGithubTools({ token, requireApproval: false })
 * ```
 *
 * @example Granular per write tool
 * ```ts
 * createGithubTools({
 *   token,
 *   requireApproval: {
 *     mergePullRequest: true,
 *     createOrUpdateFile: true,
 *     addPullRequestComment: false,
 *   },
 * })
 * ```
 */
export type ApprovalConfig = boolean | Partial<Record<GithubWriteToolName, boolean>>

/**
 * Resolve whether a write tool requires approval for the AI SDK.
 *
 * @param toolName - The write tool to check.
 * @param config - Global or per-tool approval config.
 * @returns `true` when approval is required; defaults to `true` for unspecified write tools in object mode.
 */
export function resolveAiSdkApproval(toolName: GithubWriteToolName, config: ApprovalConfig): boolean {
  if (typeof config === 'boolean') return config
  return config[toolName] ?? true
}
