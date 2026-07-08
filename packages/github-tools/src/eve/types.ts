import type { Approval, ToolModelOutput } from 'eve/tools'
import type { z } from 'zod'
import type { GithubToolPreset } from '../core/presets'
import type { GithubTokenInput } from '../core/token'
import type { GithubToolName } from '../core/tool-names'
import type { GithubWriteToolName } from '../core/write-tools'
import type { CommitIdentity } from '../types'

/**
 * Approval value for eve tools.
 * - `true` / `'always'` → require approval on every call
 * - `false` / `'never'` → skip approval
 * - `'once'` → require approval only the first time per session
 * - predicate → input-dependent gate (eve `Approval` shape)
 * - eve helpers (`always()`, `once()`, `never()`) → passthrough
 */
export type EveApprovalValue =
  | boolean
  | 'always'
  | 'once'
  | 'never'
  | Approval

export type EveApprovalConfig =
  | boolean
  | Partial<Record<GithubWriteToolName, EveApprovalValue>>

export type EveToolOverrides = Partial<Record<GithubToolName, {
  description?: string
  approval?: EveApprovalValue
  toModelOutput?: (output: unknown) => ToolModelOutput | Promise<ToolModelOutput>
  outputSchema?: z.ZodType | Record<string, unknown>
}>>

export type EveGithubToolsOptions = {
  /** GitHub token string or async provider. Defaults to `process.env.GITHUB_TOKEN`. */
  token?: GithubTokenInput
  /**
   * Restrict tools to a predefined preset.
   *
   * @see {@link GithubToolPreset} for available presets and included tools.
   */
  preset?: GithubToolPreset | GithubToolPreset[]
  /**
   * Control whether write operations require user approval before execution.
   *
   * @see {@link EveApprovalConfig} for global and per-tool options.
   */
  requireApproval?: EveApprovalConfig
  /**
   * Per-tool overrides for description, approval, output shaping, and output schema.
   *
   * @see {@link GithubToolName} for valid tool keys.
   */
  overrides?: EveToolOverrides
  /** Default author for commit-creating tools. Falls back to the authenticated user when omitted. */
  author?: CommitIdentity
  /** Default committer for commit-creating tools. Falls back to the authenticated user when omitted. */
  committer?: CommitIdentity
  /** Co-authors to attribute on all commits created by tools. */
  coAuthors?: CommitIdentity[]
}

export type EveToolFactoryOptions = Omit<EveGithubToolsOptions, 'preset'>
