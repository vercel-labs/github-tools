import { createGithubTools as createEveGithubTools } from '../eve'
import type { GithubConnectorInput } from './connector'
import { connectGithubToken } from './token'
import type { ConnectGithubEveToolsOptions } from './types'

/**
 * Register eve GitHub tools backed by a Vercel Connect connector.
 * Scopes are derived from `preset`, or from the resolved `include`/`exclude`
 * tool set when those are set, unless overridden in `connect.scopes`.
 *
 * `connector` may be a static name or a resolver function — e.g. to pick a
 * different connector per environment (production vs. preview) or tenant.
 *
 * @deprecated Use the mountable `@github-tools/eve-extension` instead and pass `connector`
 * directly to `githubExtension(...)` — no separate Connect import is needed. This direct
 * import is also **not durable** under multi-turn eve Workflow replay (`defineTool` inside
 * `node_modules` is not hoisted); mount `@github-tools/eve-extension` instead
 * (see https://github.com/vercel-labs/github-tools/issues/51 and
 * https://github-tools.com/frameworks/eve-extension).
 *
 * Shared runtime helpers used by the extension are on `@github-tools/sdk/eve-runtime`
 * (not deprecated).
 *
 * TODO(eve-connect-bundle): eve's authored-module bundler inlines workspace-linked
 * SDK code and code-splits `@vercel/connect` unless the agent sets
 * `build.externalDependencies: ['@vercel/connect']` in `agent.ts`. Prefer the
 * eve extension (pre-built) so that workaround is unnecessary.
 */
export function connectGithubTools(
  connector: GithubConnectorInput,
  options: ConnectGithubEveToolsOptions = {},
) {
  const { connect, preset, include, exclude, ...rest } = options

  return createEveGithubTools({
    ...rest,
    preset,
    include,
    exclude,
    token: connectGithubToken(connector, { preset, include, exclude, params: connect }),
  })
}
