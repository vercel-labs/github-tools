import type { ConnectTokenParams } from '@vercel/connect'
import { connectGithubScopesForSelection } from './scopes'
import type { ConnectGithubTokenOptions, GithubConnectParams } from './types'

export function resolveGithubConnectTokenParams(
  options: Omit<ConnectGithubTokenOptions, 'params'> & { params?: GithubConnectParams } = {},
): ConnectTokenParams {
  const { preset, include, exclude, params } = options
  const scopes = params?.scopes ?? connectGithubScopesForSelection({ preset, include, exclude })
  return buildConnectTokenParams(scopes, params)
}

function buildConnectTokenParams(
  scopes: string[],
  params?: GithubConnectParams,
): ConnectTokenParams {
  const { repositories, subject, ...rest } = params ?? {}

  const authorizationDetails = rest.authorizationDetails
    ?? (repositories?.length
      ? [{ type: 'github_app_installation' as const, repositories }]
      : undefined)

  return {
    subject: subject ?? { type: 'app' },
    ...rest,
    scopes,
    ...(authorizationDetails && { authorizationDetails }),
  }
}
