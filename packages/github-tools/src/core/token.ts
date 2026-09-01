import { githubToolsErrors } from './errors'

export type GithubTokenInput = string | (() => Promise<string>)
export type GithubTokenResolver = () => Promise<string>

/**
 * Normalizes a token string, async token provider, or `process.env.GITHUB_TOKEN`
 * into a `() => Promise<string>` resolver.
 *
 * Throws immediately for static inputs when no token is available. Provider
 * functions are validated lazily, each time the resolver is invoked.
 */
export function createGithubTokenResolver(token?: GithubTokenInput): GithubTokenResolver {
  if (typeof token === 'function') {
    return async () => {
      const resolvedToken = await token()
      if (!resolvedToken) {
        throw githubToolsErrors.TOKEN_REQUIRED()
      }
      return resolvedToken
    }
  }

  const resolvedToken = token || process.env.GITHUB_TOKEN
  if (!resolvedToken) {
    throw githubToolsErrors.TOKEN_REQUIRED()
  }
  return async () => resolvedToken
}

/** Resolves a {@link GithubTokenInput} to a token string. */
export function resolveGithubToken(token?: GithubTokenInput): Promise<string> {
  return createGithubTokenResolver(token)()
}
