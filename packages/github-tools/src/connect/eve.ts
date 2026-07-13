import { createGithubTools as createEveGithubTools } from '../eve'
import { connectGithubToken } from './token'
import type { ConnectGithubEveToolsOptions } from './types'

/**
 * Register eve GitHub tools backed by a Vercel Connect connector.
 * Scopes are derived from `preset` unless overridden in `connect.scopes`.
 */
export function connectGithubTools(
  connector: string,
  options: ConnectGithubEveToolsOptions = {},
) {
  const { connect, preset, ...rest } = options

  return createEveGithubTools({
    ...rest,
    preset,
    token: connectGithubToken(connector, { preset, params: connect }),
  })
}
