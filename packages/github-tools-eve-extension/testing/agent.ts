import { localDev, type AuthFn } from 'eve/channels/auth'
import type { GitHubChannelCredentials } from 'eve/channels/github'
import { GITHUB_URL_ENV } from './env.js'

// `emulateGithub` sets the emulator's URL before the agent starts, and eve sets `EVE_DEV` for `eve dev` and `eve eval` only.
const emulating = () => process.env.EVE_DEV === '1' && Boolean(process.env[GITHUB_URL_ENV])

/**
 * Auth for the eve channel that names the caller of an eval. It accepts what eve's `localDev()`
 * accepts, a request to a local development server from a loopback host, and then reads the
 * person from the `x-eval-user` header that `as('alice')` sends. A request without the header is
 * the `local-dev` caller, as with `localDev()`. In production it accepts nothing.
 *
 * ```ts
 * // agent/channels/eve.ts
 * export default eveChannel({ auth: [evalIdentity(), yourProductionAuth()] })
 * ```
 */
export function evalIdentity(): AuthFn {
  const local = localDev()
  return async (request) => {
    const accepted = await local(request)
    const person = request.headers.get('x-eval-user')
    if (!accepted || !person) return accepted
    return { authenticator: 'eval', issuer: 'https://eval.local', principalId: person, principalType: 'user', subject: person, attributes: {} }
  }
}

/**
 * Credentials for eve's GitHub channel that work against the emulator. Outside an emulated eval
 * run it returns `credentials` unchanged. In one, it replaces the webhook verifier and nothing
 * else: `connectGitHubCredentials` checks the Vercel OIDC signature Connect adds when it forwards
 * a webhook, and the emulator signs with GitHub's HMAC and the secret `emulateGithub` set.
 *
 * ```ts
 * // agent/channels/github.ts
 * export default githubChannel({
 *   credentials: underEmulation(connectGitHubCredentials('github/my-agent')),
 * })
 * ```
 */
export function underEmulation(credentials: GitHubChannelCredentials): GitHubChannelCredentials {
  if (!emulating()) return credentials
  return { ...credentials, webhookVerifier: undefined, webhookSecret: process.env.GITHUB_WEBHOOK_SECRET }
}
