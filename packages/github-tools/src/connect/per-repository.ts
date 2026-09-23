import type { GithubTokenCall } from '../core/token'
import type { GithubConnectParams } from './types'

/**
 * Connect params resolver returned by {@link perRepository}. Callable as an
 * SDK `connect` resolver (`(call)`) and as an `@github-tools/eve-extension`
 * `connect` resolver (`(ctx, call)`).
 */
export type PerRepositoryConnectResolver = {
  (call?: GithubTokenCall): GithubConnectParams
  (ctx: unknown, call: GithubTokenCall): GithubConnectParams
}

/**
 * Mint each Connect token for the GitHub App installation that owns the tool
 * call's target repository. When the call targets `owner/repo`, returns
 * `params` with `authorizationDetails: [{ type: 'github_app_installation', org: owner, repositories: [repo] }]`;
 * calls without a repository target (search, gists, notifications) get `params` unchanged.
 *
 * Use it when one GitHub App is installed on several accounts. `params` merges
 * extra static Connect params (`scopes`, `validityBufferMs`, `subject`, …).
 *
 * @example
 * ```ts
 * githubExtension({ connector: 'github/my-connector', connect: perRepository() })
 * connectGithubTools('github/my-connector', { connect: perRepository({ validityBufferMs: 60_000 }) })
 * ```
 */
export function perRepository(params: GithubConnectParams = {}): PerRepositoryConnectResolver {
  return (...args: [call?: GithubTokenCall] | [ctx: unknown, call: GithubTokenCall]) => {
    const call = args.length === 2 ? args[1] : args[0]
    if (!call?.owner || !call.repo) return params
    return {
      ...params,
      authorizationDetails: [{ type: 'github_app_installation', org: call.owner, repositories: [call.repo] }],
    }
  }
}
