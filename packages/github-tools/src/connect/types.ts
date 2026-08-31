import type { ConnectOptions, ConnectTokenParams } from '@vercel/connect'
import type { GithubToolPreset } from '../core/presets'
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

export type ConnectGithubToolsOptions = GithubToolsBaseOptions & {
  preset?: GithubToolPreset | GithubToolPreset[]
  connect?: GithubConnectParams
}

export type ConnectGithubEveToolsOptions = Omit<EveGithubToolsOptions, 'token'> & {
  connect?: GithubConnectParams
}

export type ConnectGithubTokenOptions = {
  preset?: GithubToolPreset | GithubToolPreset[]
  /** Same allow-list semantics as eve `include` — scopes derive from the resolved tools when set. */
  include?: readonly GithubToolName[]
  /** Same deny-list semantics as eve `exclude` — scopes derive from the resolved tools when set. */
  exclude?: readonly GithubToolName[]
  params?: GithubConnectParams
  connectOptions?: ConnectOptions
}
