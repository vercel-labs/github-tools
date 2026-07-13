import { createGithubTools } from '../index'
import { connectGithubToken } from './token'
import type { ConnectGithubToolsOptions } from './types'

/**
 * Create GitHub tools backed by a Vercel Connect connector.
 * Scopes are derived from `preset` unless overridden in `connect.scopes`.
 */
export function connectGithubTools(
  connector: string,
  options: ConnectGithubToolsOptions = {},
) {
  const { connect, preset, ...rest } = options

  return createGithubTools({
    ...rest,
    preset,
    token: connectGithubToken(connector, { preset, params: connect }),
  })
}
