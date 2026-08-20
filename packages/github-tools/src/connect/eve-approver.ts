import { connect } from '@vercel/connect/eve'
import type { ToolAuthProvider } from 'eve/tools'
import type { GithubConnectParams } from './types'

/**
 * Creates the user-scoped GitHub provider used to prove an eve approval
 * responder's GitHub identity. It is separate from the app-scoped write token.
 */
export function connectGithubApproverAuth(
  connector: string,
  params: GithubConnectParams = {},
): ToolAuthProvider {
  const tokenParams = { ...params }
  delete tokenParams.repositories
  return connect({
    connector,
    displayName: 'GitHub',
    principalType: 'user',
    tokenParams: {
      ...tokenParams,
      scopes: tokenParams.scopes ?? ['read:user'],
    },
  })
}
