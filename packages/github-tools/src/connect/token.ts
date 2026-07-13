import { getToken, type ConnectOptions } from '@vercel/connect'
import type { GithubTokenInput } from '../core/token'
import { resolveGithubConnectTokenParams } from './params'
import type { ConnectGithubTokenOptions } from './types'

/**
 * Returns a lazy GitHub token provider backed by a Vercel Connect connector.
 * Scopes are derived from `preset` unless overridden in `params.scopes`.
 */
export function connectGithubToken(
  connector: string,
  options: ConnectGithubTokenOptions = {},
): GithubTokenInput {
  const { connectOptions } = options
  const tokenParams = resolveGithubConnectTokenParams(options)

  return () => getToken(connector, tokenParams, connectOptions)
}

export type { ConnectOptions }
