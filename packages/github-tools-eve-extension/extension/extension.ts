import type { GithubTokenCall, GithubTokenInput } from '@github-tools/sdk'
import type { ConnectTokenSubject, GithubConnectorInput, GithubConnectParams } from '@github-tools/sdk/connect'
import type { ToolContext } from 'eve/tools'
import {
  GITHUB_TOOL_NAMES,
  GITHUB_WRITE_TOOLS,
  type CommitIdentity,
  type EveApprovalValue,
  type EveToolOverrides,
  type GithubEvaluationOptions,
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
 * Connect token subject for the extension: a static value, or a resolver
 * called with the eve tool execution context on every tool call — e.g.
 * `(ctx) => ({ type: 'user', id: ctx.session.auth.current!.principalId })`
 * to mint each caller's own GitHub connection token in multi-user apps.
 */
export type GithubConnectSubjectInput =
  | ConnectTokenSubject
  | ((ctx: ToolContext) => ConnectTokenSubject | Promise<ConnectTokenSubject>)

/**
 * Connect token params for the extension. Same as the SDK's
 * `GithubConnectParams`, except `subject` may also be a per-caller resolver.
 */
export type GithubExtensionConnectParams = Omit<GithubConnectParams, 'subject'> & {
  subject?: GithubConnectSubjectInput
}

/**
 * Resolves Connect token params for each tool call. Receives the eve tool
 * execution context and the call — `owner` / `repo` are the tool's resolved
 * inputs after `context` defaults, undefined for tools without a repository
 * target. Selecting the installation per target repository is the default and
 * needs no resolver.
 */
export type GithubExtensionConnectResolver = (
  ctx: ToolContext,
  call: GithubTokenCall,
) => GithubExtensionConnectParams | Promise<GithubExtensionConnectParams>

/**
 * Approval for one write tool: an eve approval value, or `'auto'` to let an
 * evaluation model skip approval for low-risk calls the user asked for.
 */
export type GithubExtensionApprovalValue = EveApprovalValue | 'auto'

/**
 * Global approval mode or per-tool approval values. `'auto'` evaluates the
 * low-risk write tools (`AUTO_APPROVAL_TOOLS`) and keeps approval on the rest.
 */
export type GithubExtensionApprovalConfig =
  | boolean
  | 'auto'
  | Partial<Record<GithubWriteToolName, GithubExtensionApprovalValue>>

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
  /**
   * Vercel Connect token params passed through to `getToken` when `connector`
   * is set. `subject` defaults to `{ type: 'app' }` (the project's GitHub App
   * installation, shared by every caller); pass a value or a per-caller
   * resolver to mint per-user tokens instead.
   *
   * App tokens target the GitHub App installation owning each call's
   * repository, so an App installed on several accounts needs nothing here;
   * `installationId`, `authorizationDetails` or `repositories` pins one. Pass
   * a resolver for other per-call rules. Scopes still derive from `preset` /
   * `include` / `exclude` unless the resolved params set `scopes`.
   */
  connect?: GithubExtensionConnectParams | GithubExtensionConnectResolver
  /**
   * Restrict tools to a preset (or array of presets). Prefer a focused preset; omit or use `maintainer` for the full catalog.
   * `'auto'` picks up to two presets per user message with an evaluation model, and never exposes the full catalog.
   */
  preset?: GithubToolPreset | GithubToolPreset[] | 'auto'
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
   * Global boolean, `'auto'`, or per-tool approval config.
   * Per-tool values may be `'once'`, `'always'`, `'never'`, `'auto'`, or predicate functions.
   */
  requireApproval?: GithubExtensionApprovalConfig
  /** Tuning for `preset: 'auto'` and `'auto'` approval. The evaluation model defaults to TypeSafe Jev. */
  evaluation?: GithubEvaluationOptions
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
  connect: z.union([
    z.record(z.string(), z.unknown()),
    z.custom<GithubExtensionConnectResolver>(value => typeof value === 'function'),
  ]).optional(),
  preset: z.union([presetNameSchema, z.array(presetNameSchema), z.literal('auto')]).optional(),
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
  requireApproval: z.union([z.boolean(), z.literal('auto'), z.partialRecord(writeToolNameSchema, z.unknown())]).optional(),
  evaluation: z.object({
    model: z.custom<GithubEvaluationOptions['model']>(
      value => typeof value === 'string' || (typeof value === 'object' && value !== null),
    ).optional(),
    maxRisk: z.number().optional(),
    minIntent: z.number().optional(),
    minPresetProbability: z.number().optional(),
    maxPresets: z.number().optional(),
  }).optional(),
  overrides: z.partialRecord(toolNameSchema, z.unknown()).optional(),
  author: commitIdentitySchema.optional(),
  committer: commitIdentitySchema.optional(),
  coAuthors: z.array(commitIdentitySchema).optional(),
}) as z.ZodType<GithubExtensionConfig, GithubExtensionConfig>

export default defineExtension({
  config: configSchema,
})
