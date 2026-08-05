import { getToken, type ConnectOptions } from '@vercel/connect'
import type { GithubTokenInput } from '../core/token'
import { resolveGithubConnector, type GithubConnectorInput } from './connector'
import { resolveGithubConnectTokenParams } from './params'
import type { ConnectGithubTokenOptions } from './types'

/**
 * Returns a lazy GitHub token provider backed by a Vercel Connect connector.
 * Scopes are derived from `preset` unless overridden in `params.scopes`.
 *
 * `connector` may be a static name or a resolver function — e.g. to pick a
 * different connector per environment (production vs. preview) or tenant.
 * It's re-resolved on every call, alongside the token itself.
 */
export function connectGithubToken(
  connector: GithubConnectorInput,
  options: ConnectGithubTokenOptions = {},
): GithubTokenInput {
  const { connectOptions } = options
  const tokenParams = resolveGithubConnectTokenParams(options)

  return async () => getToken(await resolveGithubConnector(connector), tokenParams, connectOptions)
}

export type { ConnectOptions }
