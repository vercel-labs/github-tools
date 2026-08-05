import { createGithubTools } from '../index'
import type { GithubConnectorInput } from './connector'
import { connectGithubToken } from './token'
import type { ConnectGithubToolsOptions } from './types'

/**
 * Create GitHub tools backed by a Vercel Connect connector.
 * Scopes are derived from `preset` unless overridden in `connect.scopes`.
 *
 * `connector` may be a static name or a resolver function — e.g. to pick a
 * different connector per environment (production vs. preview) or tenant.
 */
export function connectGithubTools(
  connector: GithubConnectorInput,
  options: ConnectGithubToolsOptions = {},
) {
  const { connect, preset, ...rest } = options

  return createGithubTools({
    ...rest,
    preset,
    token: connectGithubToken(connector, { preset, params: connect }),
  })
}
