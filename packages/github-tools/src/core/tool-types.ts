import type { ApprovalConfig } from './approval'
import type { CombinedPresetToolNames, GithubToolPreset, PresetToolName } from './presets'
import type { GithubTokenInput } from './token'
import type { GithubToolName } from './tool-names'
import type { CommitIdentity, GithubTool, ToolOverrides } from '../types'

/** Full tool set returned when no `preset` is specified. */
export type AllGithubTools = Record<GithubToolName, GithubTool>

/** Base options shared by all {@link createGithubTools} overloads. */
export type GithubToolsBaseOptions = {
  /** GitHub token string or async provider. Falls back to `process.env.GITHUB_TOKEN` when omitted. */
  token?: GithubTokenInput
  /** Control whether write operations require user approval. @see {@link ApprovalConfig} */
  requireApproval?: ApprovalConfig
  /** Per-tool overrides for description, title, needsApproval, and related AI SDK tool fields. */
  overrides?: Partial<Record<GithubToolName, ToolOverrides>>
  /** Default author for commit-creating tools. Falls back to the authenticated user when omitted. */
  author?: CommitIdentity
  /** Default committer for commit-creating tools. Falls back to the authenticated user when omitted. */
  committer?: CommitIdentity
  /** Co-authors to attribute on all commits created by tools. */
  coAuthors?: CommitIdentity[]
}

/** Tool set shape for a given preset option (single, combined, or all tools). */
export type GithubToolsForPreset<P extends GithubToolPreset | readonly GithubToolPreset[] | undefined> =
  P extends GithubToolPreset
    ? Pick<AllGithubTools, PresetToolName<P> & GithubToolName>
    : P extends readonly GithubToolPreset[]
      ? Pick<AllGithubTools, CombinedPresetToolNames<P> & GithubToolName>
      : AllGithubTools

/** Pick a subset of GitHub tools by tool name. */
export type PickGithubTools<T extends GithubToolName> = Pick<AllGithubTools, T>
