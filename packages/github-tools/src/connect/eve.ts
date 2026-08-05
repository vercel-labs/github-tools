import { createGithubTools as createEveGithubTools } from '../eve'
import type { GithubConnectorInput } from './connector'
import { connectGithubToken } from './token'
import type { ConnectGithubEveToolsOptions } from './types'

/**
 * Register eve GitHub tools backed by a Vercel Connect connector.
 * Scopes are derived from `preset` unless overridden in `connect.scopes`.
 *
 * `connector` may be a static name or a resolver function — e.g. to pick a
 * different connector per environment (production vs. preview) or tenant.
 *
 * TODO(eve-connect-bundle): eve's authored-module bundler inlines workspace-linked
 * SDK code and code-splits `@vercel/connect` unless the agent sets
 * `build.externalDependencies: ['@vercel/connect']` in `agent.ts`. Remove that
 * requirement when upstream eve externalizes this path.
 */
export function connectGithubTools(
  connector: GithubConnectorInput,
  options: ConnectGithubEveToolsOptions = {},
) {
  const { connect, preset, ...rest } = options

  return createEveGithubTools({
    ...rest,
    preset,
    token: connectGithubToken(connector, { preset, params: connect }),
  })
}
