import { getToken, type ConnectOptions } from '@vercel/connect'
import type { GithubTokenInput } from '../core/token'
import { resolveGithubConnector, type GithubConnectorInput } from './connector'
import { resolveGithubConnectTokenParams } from './params'
import type { ConnectGithubTokenOptions } from './types'

/**
 * Returns a lazy GitHub token provider backed by a Vercel Connect connector.
 * Scopes are derived from `preset`, or from the resolved `include`/`exclude`
 * tool set when those are set, unless overridden in `params.scopes`.
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

  return async () => getToken(
    await resolveGithubConnector(connector),
    tokenParams,
    resolveConnectOptions(connectOptions),
  )
}

/**
 * Prefer an explicit `vercelToken`, then `VERCEL_OIDC_TOKEN` from the environment.
 * Passing the env token into `getToken` skips `@vercel/oidc`'s project-root walk,
 * which fails inside eve/workflow snapshots that have no `.vercel` directory.
 */
function resolveConnectOptions(connectOptions?: ConnectOptions): ConnectOptions | undefined {
  const vercelToken = connectOptions?.vercelToken ?? process.env.VERCEL_OIDC_TOKEN
  if (!vercelToken && !connectOptions) return undefined
  return {
    ...vercelToken ? { vercelToken } : {},
    ...connectOptions,
  }
}

export type { ConnectOptions }
