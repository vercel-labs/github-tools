import type { ConnectOptions, ConnectTokenParams } from '@vercel/connect'
import type { GithubToolPreset } from '../core/presets'
import type { GithubToolsBaseOptions } from '../core/tool-types'
import type { EveGithubToolsOptions } from '../eve/types'

/**
 * Token parameters for Vercel Connect GitHub connectors.
 * `subject` is pinned to `{ type: 'app' }` by the SDK — same as `connectGitHubAdapter`.
 */
export type GithubConnectParams = Omit<ConnectTokenParams, 'subject'> & {
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
  params?: GithubConnectParams
  connectOptions?: ConnectOptions
}
