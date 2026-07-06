import type { GithubWriteToolName } from './write-tools'

/**
 * Whether write operations require user approval.
 * - `true`  — all write tools need approval (default)
 * - `false` — no approval needed for any write tool
 * - object  — per-tool override; unspecified write tools default to `true`
 */
export type ApprovalConfig = boolean | Partial<Record<GithubWriteToolName, boolean>>

export function resolveAiSdkApproval(toolName: GithubWriteToolName, config: ApprovalConfig): boolean {
  if (typeof config === 'boolean') return config
  return config[toolName] ?? true
}
