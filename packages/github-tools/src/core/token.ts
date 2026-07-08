export type GithubTokenInput = string | (() => Promise<string>)
export type GithubTokenResolver = () => Promise<string>
export type GithubTokenStepArgs<T extends { resolveToken: GithubTokenResolver }> = Omit<T, 'resolveToken'> & { token: string }

export function createGithubTokenStepResolver(token: string): GithubTokenResolver {
  return async () => token
}

export function createGithubTokenResolver(token?: GithubTokenInput): GithubTokenResolver {
  if (typeof token !== 'function') {
    const resolvedToken = token || process.env.GITHUB_TOKEN

    if (!resolvedToken) {
      throw new Error('GitHub token is required. Pass it as `token` or set the GITHUB_TOKEN environment variable.')
    }

    return async () => resolvedToken
  }

  return async () => {
    const resolvedToken = await token()

    if (!resolvedToken) {
      throw new Error('GitHub token is required. Pass it as `token` or set the GITHUB_TOKEN environment variable.')
    }

    return resolvedToken
  }
}
