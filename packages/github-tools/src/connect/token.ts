import {
  ConnectError,
  ConnectorInstallationRequiredError,
  getToken,
  UserAuthorizationRequiredError,
  type ConnectOptions,
  type ConnectTokenParams,
} from '@vercel/connect'
import { githubToolsErrors } from '../core/errors'
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

  return async () => {
    try {
      return await getToken(
        await resolveGithubConnector(connector),
        tokenParams,
        resolveConnectOptions(connectOptions),
      )
    }
    catch (error) {
      throw toConnectCatalogError(error, tokenParams)
    }
  }
}

/**
 * Map @vercel/connect failures to catalog errors so models get the actual
 * cause (process identity, missing user connection, missing installation)
 * instead of a bare "Not authorized" they misread as GitHub permissions.
 */
function toConnectCatalogError(error: unknown, tokenParams: ConnectTokenParams): unknown {
  if (error instanceof UserAuthorizationRequiredError) {
    const subjectId = tokenParams.subject.type === 'user' ? tokenParams.subject.id : tokenParams.subject.type
    return githubToolsErrors.CONNECT_USER_NOT_CONNECTED({ subjectId, cause: error })
  }
  if (error instanceof ConnectorInstallationRequiredError) {
    return githubToolsErrors.CONNECT_INSTALLATION_REQUIRED({ detail: error.message, cause: error })
  }
  if (error instanceof ConnectError && error.status === 403) {
    return githubToolsErrors.CONNECT_NOT_AUTHORIZED({ detail: error.message, cause: error })
  }
  return error
}

/**
 * Best-effort JWT `exp` claim, in epoch seconds. Returns undefined for
 * malformed tokens — Connect then rejects them with its own error.
 */
function oidcTokenExpiry(token: string): number | undefined {
  const payload = token.split('.')[1]
  if (!payload) return undefined
  try {
    const claims: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (claims == null || typeof claims !== 'object' || !('exp' in claims)) return undefined
    return typeof claims.exp === 'number' ? claims.exp : undefined
  }
  catch {
    return undefined
  }
}

/**
 * Prefer an explicit `vercelToken`, then `VERCEL_OIDC_TOKEN` from the environment.
 * Passing the env token into `getToken` skips `@vercel/oidc`'s project-root walk,
 * which fails inside eve/workflow snapshots that have no `.vercel` directory.
 *
 * Pinning also disables refresh, so an expired token fails loudly here instead
 * of surfacing as an opaque Connect 403 the model misreads as GitHub permissions.
 */
function resolveConnectOptions(connectOptions?: ConnectOptions): ConnectOptions | undefined {
  const vercelToken = connectOptions?.vercelToken ?? process.env.VERCEL_OIDC_TOKEN
  if (vercelToken) {
    const exp = oidcTokenExpiry(vercelToken)
    if (exp !== undefined && exp * 1000 <= Date.now()) {
      throw githubToolsErrors.OIDC_TOKEN_EXPIRED({ expiredAt: new Date(exp * 1000).toISOString() })
    }
  }
  if (!vercelToken && !connectOptions) return undefined
  return {
    ...vercelToken ? { vercelToken } : {},
    ...connectOptions,
  }
}

export type { ConnectOptions }
