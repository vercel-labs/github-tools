import type { GithubCaller } from '@github-tools/sdk/eve-runtime'

type SessionAuth = {
  readonly authenticator?: string
  readonly principalType?: string
  readonly attributes?: Readonly<Record<string, string | readonly string[]>>
} | null | undefined

/**
 * The person behind a turn from eve's GitHub channel, or `undefined` for any other caller. GitHub
 * vouches for who they are, but a public comment can't carry a sign-in, so they never get a token
 * of their own.
 */
export function githubCommenter(auth: SessionAuth): GithubCaller | undefined {
  if (auth?.authenticator !== 'github-webhook' || auth.principalType !== 'user') return undefined
  const { user_login: login, repository } = auth.attributes ?? {}
  if (typeof login !== 'string' || !login) return undefined
  const [owner, repo] = typeof repository === 'string' ? repository.split('/') : []
  return { login, ...(owner && repo && { repository: { owner, repo } }) }
}
