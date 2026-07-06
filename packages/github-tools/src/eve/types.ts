import type { Approval, ToolModelOutput } from 'eve/tools'
import type { z } from 'zod'
import type { GithubToolPreset } from '../core/presets'
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

export type EveToolOverrides = Partial<Record<string, {
  description?: string
  approval?: EveApprovalValue
  toModelOutput?: (output: unknown) => ToolModelOutput | Promise<ToolModelOutput>
  outputSchema?: z.ZodType | Record<string, unknown>
}>>

export type EveGithubToolsOptions = {
  /** Defaults to `process.env.GITHUB_TOKEN`. */
  token?: string
  preset?: GithubToolPreset | GithubToolPreset[]
  requireApproval?: EveApprovalConfig
  overrides?: EveToolOverrides
  author?: CommitIdentity
  committer?: CommitIdentity
  coAuthors?: CommitIdentity[]
}

export type EveToolFactoryOptions = Omit<EveGithubToolsOptions, 'preset'>
