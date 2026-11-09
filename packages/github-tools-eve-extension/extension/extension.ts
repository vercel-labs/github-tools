import type { GithubTokenCall, GithubTokenInput } from '@github-tools/sdk'
import type { ConnectTokenSubject, GithubConnectorInput, GithubConnectParams } from '@github-tools/sdk/connect'
import type { ToolContext } from 'eve/tools'
import {
  GITHUB_TOOL_NAMES,
  GITHUB_WRITE_TOOLS,
  PRESET_TOOLS,
  type CommitIdentity,
  type EveApprovalValue,
  type EveToolOverrides,
  type GithubEvaluationOptions,
  type GithubGuardrails,
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
 * Whose GitHub access a tool call uses: the GitHub App installation
 * (`'app'`), the signed-in user (`'user'`), or the user when one drives the
 * turn and the App otherwise (`'caller'`).
 */
export type GithubActAs = 'app' | 'user' | 'caller'

/** One identity for every tool, or one for read tools and one for write tools. */
export type GithubExtensionActAs = GithubActAs | { read?: GithubActAs, write?: GithubActAs }

/** Who may answer an approval: only the requester, or any signed-in user. */
export type GithubExtensionApprovers = 'requester' | 'anyone'

/** Per-tool overrides, including the tool's own `actAs`. */
export type GithubExtensionToolOverrides = {
  [K in GithubToolName]?: NonNullable<EveToolOverrides[K]> & { actAs?: GithubActAs }
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
  /**
   * Whose GitHub access the tools use when `connector` is set.
   *
   * - `'app'` (default): the connector's GitHub App installation. Every
   *   caller shares the App's permissions.
   * - `'user'`: the signed-in user of the eve session. Each user authorizes
   *   the GitHub App once, through eve's sign-in prompt, and every call then
   *   runs with their own GitHub token. Sessions without a signed-in user
   *   (schedules, `localDev()`) fail instead of falling back to the App.
   * - `'caller'`: `'user'` when a signed-in user drives the turn, the App when
   *   nobody does (schedules, automations, bots). A user who has not
   *   authorized the App is asked to sign in; the call never falls back to
   *   the App for them.
   *
   * GitHub allows a user-token call only when both the user and the App have
   * access, so a maintainer can do what a maintainer can, and a reader can
   * only read. An approved call runs with the approver's token: see
   * `approvers`.
   *
   * Pass `{ read, write }` to pick per tool kind (each defaults to `'app'`),
   * and `overrides.<tool>.actAs` for a single tool. The default may change to
   * `'caller'` in a future major version.
   */
  actAs?: GithubExtensionActAs
  /**
   * Who may answer an approval.
   *
   * - `'requester'` (default): only the person who asked for the call. A
   *   colleague in a shared thread cannot approve it for them.
   * - `'anyone'`: opt-in for simple shared agents. Any signed-in user can
   *   approve, and anyone can deny. For
   *   tools that act as `'user'` or `'caller'`, the approved call runs with
   *   the approver's GitHub token, so GitHub records the approver and checks
   *   their permissions, and an approver who has not authorized the App signs
   *   in before the approval counts. For `'app'` tools the approval is a gate
   *   only: the call still runs as the App.
   */
  approvers?: GithubExtensionApprovers
  /**
   * Vercel Connect token params passed through to `getToken` when `connector`
   * is set. `subject` defaults to `{ type: 'app' }` (the project's GitHub App
   * installation, shared by every caller). For per-user tokens, prefer
   * `actAs: 'user'` or `'caller'`, which also let eve prompt users who have
   * not connected GitHub yet. With `'caller'`, these params apply to the
   * calls that run as the App.
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
   * `'auto'` lists the tools an evaluation model picks for the session's first request, plus the core read tools,
   * and defers every other tool: the model can still find it with `eve__search`. Set `evaluation.selection: 'presets'`
   * to list up to two routed presets instead.
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
  /** Per-tool overrides (`description`, `approval`, `actAs`, `toModelOutput`, `outputSchema`). */
  overrides?: GithubExtensionToolOverrides
  /** Default author for commit-creating tools. */
  author?: CommitIdentity
  /** Default committer for commit-creating tools. */
  committer?: CommitIdentity
  /** Co-authors to attribute on commits created by tools. */
  coAuthors?: CommitIdentity[]
  /**
   * Repositories and branches the tools may act on, checked before each call reaches GitHub.
   * `repositories` takes `owner/repo` or `owner/*`; `branches` takes names or patterns such as
   * `agent/*` and covers commits, branch creation and deletion, and merges into a pull request's
   * base. A blocked write is denied with the reason instead of asking anyone to approve it.
   */
  guardrails?: GithubGuardrails
}

const presetNameSchema = z.enum(Object.keys(PRESET_TOOLS) as [GithubToolPreset, ...GithubToolPreset[]])
const toolNameSchema = z.enum(Object.values(GITHUB_TOOL_NAMES) as [GithubToolName, ...GithubToolName[]])
const writeToolNameSchema = z.enum(Object.values(GITHUB_WRITE_TOOLS) as [GithubWriteToolName, ...GithubWriteToolName[]])

const actAsSchema = z.enum(['app', 'user', 'caller'])

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
  actAs: z.union([actAsSchema, z.object({ read: actAsSchema.optional(), write: actAsSchema.optional() })]).optional(),
  approvers: z.enum(['requester', 'anyone']).optional(),
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
    selection: z.enum(['presets', 'tools']).optional(),
    scope: z.enum(['turn', 'session']).optional(),
    minToolProbability: z.number().optional(),
    maxTools: z.number().optional(),
    providerOptions: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  }).optional(),
  overrides: z.partialRecord(toolNameSchema, z.looseObject({ actAs: actAsSchema.optional() })).optional(),
  author: commitIdentitySchema.optional(),
  committer: commitIdentitySchema.optional(),
  coAuthors: z.array(commitIdentitySchema).optional(),
  guardrails: z.object({
    repositories: z.array(z.string()).optional(),
    branches: z.array(z.string()).optional(),
  }).optional(),
}).superRefine((config, ctx) => {
  const { actAs } = config
  const identities = [
    ...(typeof actAs === 'object' ? [actAs.read, actAs.write] : [actAs]),
    ...Object.values(config.overrides ?? {}).map(override => override?.actAs),
  ]
  if (config.connector === undefined && identities.some(identity => identity !== undefined && identity !== 'app')) {
    ctx.addIssue({ code: 'custom', path: ['actAs'], message: '`actAs: \'user\'` and `\'caller\'` need a Vercel Connect `connector`.' })
  }
  if (actAs === 'user' && config.connect !== undefined) {
    ctx.addIssue({ code: 'custom', path: ['connect'], message: '`connect` configures App tokens and cannot be combined with `actAs: \'user\'`.' })
  }
}) as z.ZodType<GithubExtensionConfig, GithubExtensionConfig>

export default defineExtension({
  config: configSchema,
})
