import type { GithubTokenInput } from '@github-tools/sdk'
import type { GithubConnectorInput } from '@github-tools/sdk/connect'
import {
  GITHUB_TOOL_NAMES,
  GITHUB_WRITE_TOOLS,
  type CommitIdentity,
  type EveApprovalConfig,
  type EveToolOverrides,
  type GithubToolName,
  type GithubToolPreset,
  type GithubWriteToolName,
} from '@github-tools/sdk/eve-runtime'
import { defineExtension } from 'eve/extension'
import { z } from 'zod'

/**
 * Default owner / repo / PR / issue / ref for tool inputs.
 * Matching fields become optional and fill from this context when omitted.
 */
export interface GithubExtensionContext {
  /** Repository owner (org or user login). */
  owner?: string
  /** Repository name. */
  repo?: string
  /** Default pull request number for PR tools. */
  pullNumber?: number
  /** Default issue number for issue tools. */
  issueNumber?: number
  /** Default git ref (branch, tag, or SHA). */
  ref?: string
}

/**
 * Config passed to `githubExtension({ ... })` at the agent mount site.
 * Declared as an interface (not only a Zod schema) so IDE hovers show JSDoc.
 */
export interface GithubExtensionConfig {
  /**
   * GitHub token: a PAT string, or a `() => Promise<string>` provider for
   * tokens that rotate (a GitHub App installation token, a vault lease).
   * Same input the SDK accepts. Falls back to `GITHUB_TOKEN` when omitted
   * and `connector` is not set.
   */
  token?: GithubTokenInput
  /**
   * Vercel Connect connector name (e.g. `github/my-connector`), or a
   * `() => string | Promise<string>` resolver for picking one dynamically
   * (e.g. per environment or tenant). Takes priority over `token`.
   */
  connector?: GithubConnectorInput
  /** Vercel Connect token params passed through to `getToken` when `connector` is set. */
  connect?: Record<string, unknown>
  /** Restrict tools to a preset (or array of presets). Prefer a focused preset; omit or use `maintainer` for the full catalog. */
  preset?: GithubToolPreset | GithubToolPreset[]
  /**
   * Hand-pick tool names to add on top of `preset` (or standalone, without `preset`).
   * When combined with `preset`, the effective set is the union of both.
   */
  include?: GithubToolName[]
  /** Remove specific tool names from the resolved set, applied after `preset` + `include`. */
  exclude?: GithubToolName[]
  /**
   * Default owner / repo / pullNumber / issueNumber / ref for tool inputs
   * (matching fields become optional and fill from context when omitted).
   */
  context?: GithubExtensionContext
  /**
   * Global boolean or per-tool approval config.
   * Per-tool values may be `'once'`, `'always'`, `'never'`, or predicate functions.
   */
  requireApproval?: EveApprovalConfig
  /** Per-tool overrides (`description`, `approval`, `toModelOutput`, `outputSchema`). */
  overrides?: EveToolOverrides
  /** Default author for commit-creating tools. */
  author?: CommitIdentity
  /** Default committer for commit-creating tools. */
  committer?: CommitIdentity
  /** Co-authors to attribute on commits created by tools. */
  coAuthors?: CommitIdentity[]
}

const presetNameSchema = z.enum([
  'code-review',
  'issue-triage',
  'ci-ops',
  'repo-explorer',
  'security-audit',
  'release-manager',
  'discussion-moderator',
  'notification-inbox',
  'pr-author',
  'maintainer',
])
const toolNameSchema = z.enum(Object.values(GITHUB_TOOL_NAMES) as [GithubToolName, ...GithubToolName[]])
const writeToolNameSchema = z.enum(Object.values(GITHUB_WRITE_TOOLS) as [GithubWriteToolName, ...GithubWriteToolName[]])

const commitIdentitySchema = z.object({
  name: z.string(),
  email: z.string(),
})

const configSchema = z.object({
  token: z.custom<GithubTokenInput>(
    value => typeof value === 'string' || typeof value === 'function',
  ).optional(),
  connector: z.custom<GithubConnectorInput>(
    value => typeof value === 'string' || typeof value === 'function',
  ).optional(),
  connect: z.record(z.string(), z.unknown()).optional(),
  preset: z.union([presetNameSchema, z.array(presetNameSchema)]).optional(),
  include: z.array(toolNameSchema).optional(),
  exclude: z.array(toolNameSchema).optional(),
  context: z.object({
    owner: z.string().optional(),
    repo: z.string().optional(),
    pullNumber: z.number().optional(),
    issueNumber: z.number().optional(),
    ref: z.string().optional(),
  }).optional(),
  // Key validation only — a mistyped tool name would otherwise be silently
  // ignored and the tool would keep its default behavior with no signal.
  requireApproval: z.union([z.boolean(), z.partialRecord(writeToolNameSchema, z.unknown())]).optional(),
  overrides: z.partialRecord(toolNameSchema, z.unknown()).optional(),
  author: commitIdentitySchema.optional(),
  committer: commitIdentitySchema.optional(),
  coAuthors: z.array(commitIdentitySchema).optional(),
}) as z.ZodType<GithubExtensionConfig, GithubExtensionConfig>

export default defineExtension({
  config: configSchema,
})
