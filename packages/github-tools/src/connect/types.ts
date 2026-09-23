import type { ConnectOptions, ConnectTokenParams } from '@vercel/connect'
import type { GithubToolPreset } from '../core/presets'
import type { GithubTokenCall } from '../core/token'
import type { GithubToolName } from '../core/tool-names'
import type { GithubToolsBaseOptions } from '../core/tool-types'
import type { EveGithubToolsOptions } from '../eve/types'

/**
 * Token parameters for Vercel Connect GitHub connectors.
 * `subject` defaults to `{ type: 'app' }` — the project's GitHub App
 * installation, same as `connectGitHubAdapter`.
 */
export type GithubConnectParams = Omit<ConnectTokenParams, 'subject'> & {
  /**
   * Connect token subject. Defaults to `{ type: 'app' }` (the project's GitHub
   * App installation — one identity shared by every caller). Pass
   * `{ type: 'user', id }` to mint a token for that user's own GitHub
   * connection instead, e.g. in multi-user apps where each user connects
   * their account from an integrations panel.
   */
  subject?: ConnectTokenParams['subject']
  /** Restrict the token to specific repositories via GitHub authorization details. */
  repositories?: string[]
}

/**
 * Resolves Connect token params for each tool call, e.g. to select the GitHub
 * App installation that owns the call's target repository (see
 * {@link perRepository}). `call` is undefined when the token is resolved
 * outside a tool call. Unless the returned params set `scopes`, scopes are
 * still derived from `preset` / `include` / `exclude`.
 */
export type GithubConnectParamsResolver = (
  call?: GithubTokenCall,
) => GithubConnectParams | Promise<GithubConnectParams>

/** Static Connect token params, or a per-call {@link GithubConnectParamsResolver}. */
export type GithubConnectParamsInput = GithubConnectParams | GithubConnectParamsResolver

export type ConnectGithubToolsOptions = GithubToolsBaseOptions & {
  preset?: GithubToolPreset | GithubToolPreset[]
  connect?: GithubConnectParamsInput
}

export type ConnectGithubEveToolsOptions = Omit<EveGithubToolsOptions, 'token'> & {
  connect?: GithubConnectParamsInput
}

export type ConnectGithubTokenOptions = {
  preset?: GithubToolPreset | GithubToolPreset[]
  /** Same allow-list semantics as eve `include` — scopes derive from the resolved tools when set. */
  include?: readonly GithubToolName[]
  /** Same deny-list semantics as eve `exclude` — scopes derive from the resolved tools when set. */
  exclude?: readonly GithubToolName[]
  params?: GithubConnectParamsInput
  connectOptions?: ConnectOptions
}
