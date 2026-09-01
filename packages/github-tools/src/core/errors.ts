import { defineErrorCatalog, EvlogError } from 'evlog'
import { formatRateLimitSuffix, type GithubRateLimit } from './rate-limit'

/**
 * Structured error catalog for every failure the SDK can surface to a model
 * or a consumer. Each entry carries `why` (technical cause) and `fix`
 * (actionable remedy) so agents can recover instead of guessing — a bare
 * "Not authorized" reads as "the repo is private" to a model; the catalog
 * version names the real cause.
 */
export const githubToolsErrors = defineErrorCatalog('github_tools', {
  TOKEN_REQUIRED: {
    status: 401,
    message: 'GitHub token is required. Pass it as `token` or set the GITHUB_TOKEN environment variable.',
    why: 'No token string, async token provider, or GITHUB_TOKEN environment variable was available when the tool resolved its GitHub credentials.',
    fix: 'Pass `token` (a PAT string or async provider) when creating the tools, set GITHUB_TOKEN, or configure a Vercel Connect `connector`.',
  },
  OIDC_TOKEN_EXPIRED: {
    status: 401,
    message: ({ expiredAt }: { expiredAt: string }) =>
      `VERCEL_OIDC_TOKEN expired at ${expiredAt}; Vercel Connect would reject it, so no GitHub request was made.`,
    why: 'The SDK pins the VERCEL_OIDC_TOKEN environment token when it is set (skipping @vercel/oidc\'s project-root walk, which fails inside eve/workflow snapshots), so an expired env token is never refreshed automatically.',
    fix: 'Locally: run `vercel env pull` to refresh .env.local. On Vercel: deployments inject a fresh token — check nothing overrides VERCEL_OIDC_TOKEN with a stale value.',
  },
  CONNECT_NOT_AUTHORIZED: {
    status: 403,
    message: ({ detail }: { detail: string }) =>
      `Vercel Connect refused to mint a GitHub token: ${detail}`,
    why: 'Connect rejected the identity of the calling process (the Vercel OIDC token), not the GitHub permissions — the request never reached GitHub.',
    fix: 'Refresh the OIDC token (`vercel env pull` locally) and check the connector is linked to the Vercel project this code runs in.',
  },
  CONNECT_USER_NOT_CONNECTED: {
    status: 401,
    message: ({ subjectId }: { subjectId: string }) =>
      `No active GitHub connection for user "${subjectId}".`,
    why: 'The Connect token was requested with a user subject, but that user has not connected their GitHub account to this connector (or revoked the authorization).',
    fix: 'Have the user connect their GitHub account (e.g. from the integrations panel), then retry.',
  },
  CONNECT_INSTALLATION_REQUIRED: {
    status: 401,
    message: ({ detail }: { detail: string }) =>
      `The Connect connector has no usable GitHub App installation: ${detail}`,
    why: 'The connector exists but its GitHub App is not installed on the target org or user account.',
    fix: 'Install the connector\'s GitHub App on the org or account the agent needs, from the Vercel Connect dashboard.',
  },
  SUBJECT_CONTEXT_REQUIRED: {
    status: 500,
    message: 'connect.subject resolver needs the tool execution context — it is only available while a tool call executes.',
    why: 'The per-caller subject resolver was invoked without an eve ToolContext, which only exists during tool execution.',
    fix: 'Keep `connect.subject` resolution on the tool execute path; use a static subject when no execution context is available.',
  },
  UNAUTHORIZED: {
    status: 401,
    message: ({ detail }: { detail: string }) => `GitHub rejected the credentials (401): ${detail}`,
    why: 'The GitHub token is invalid, expired, or revoked.',
    fix: 'Rotate the credential: regenerate the PAT or re-mint the installation token, then update the token source.',
  },
  FORBIDDEN: {
    status: 403,
    message: ({ detail }: { detail: string }) => `GitHub refused the request (403): ${detail}`,
    why: 'The token authenticated but lacks permission: a missing scope on this resource, SAML SSO enforcement, or an API that only accepts user access tokens (gists, notifications) called with an installation token.',
    fix: 'Grant the missing permission on the PAT or GitHub App installation; authorize the token for SAML if the org enforces it; use a user access token for gist and notification tools.',
  },
  RATE_LIMITED: {
    status: 429,
    message: ({ detail }: { detail: string }) => `GitHub rate limit exhausted: ${detail}`,
    why: 'The token used up its GitHub API rate limit for this resource.',
    fix: 'Stop calling this tool and retry after the reset timestamp in the message; batch reads or narrow the query to spend fewer requests.',
  },
  NOT_FOUND: {
    status: 404,
    message: ({ detail }: { detail: string }) => `GitHub resource not found (404): ${detail}`,
    why: 'Either the resource does not exist, or the token cannot see it — GitHub deliberately returns 404 instead of 403 for private resources the token has no access to.',
    fix: 'Check the owner/repo/number input first. If it is correct, the token lacks access: grant the repository to the PAT or App installation, or use a Connect subject that has access.',
  },
  VALIDATION_FAILED: {
    status: 422,
    message: ({ detail }: { detail: string }) => `GitHub rejected the request as invalid (422): ${detail}`,
    why: 'The input was well-formed but GitHub refused it — a duplicate resource, an immutable state transition, or an unresolvable ref.',
    fix: 'The embedded GitHub message names the offending field or state; adjust the input and retry.',
  },
})

declare module 'evlog' {
  interface RegisteredErrorCatalogs {
    github_tools: typeof githubToolsErrors
  }
}

function errorStatus(error: unknown): number | undefined {
  if (error == null || typeof error !== 'object' || !('status' in error)) return undefined
  const status = (error as { status?: unknown }).status
  return typeof status === 'number' ? status : undefined
}

function requestTarget(error: Error): Record<string, unknown> {
  const request = (error as { request?: { method?: string, url?: string } }).request
  return request?.url ? { method: request.method, url: request.url } : {}
}

/**
 * Map an Octokit request error to a catalog error by HTTP status. Statuses
 * without a dedicated entry (5xx, 301, …) pass through unchanged. The original
 * error stays reachable as `cause`; request coordinates land in `internal`
 * (never serialized toward the model).
 */
export function toGithubToolsError(error: unknown, rateLimit: GithubRateLimit | undefined): unknown {
  const status = errorStatus(error)
  if (status === undefined || !(error instanceof Error)) return error

  const detail = error.message
  const overrides = { cause: error, internal: { status, ...requestTarget(error) } }

  if (status === 401) return githubToolsErrors.UNAUTHORIZED({ detail, ...overrides })
  if (status === 404) return githubToolsErrors.NOT_FOUND({ detail, ...overrides })
  if (status === 422) return githubToolsErrors.VALIDATION_FAILED({ detail, ...overrides })
  if (status === 429 || (status === 403 && rateLimit?.remaining === 0)) {
    const suffix = rateLimit ? ` (${formatRateLimitSuffix(rateLimit)})` : ''
    return githubToolsErrors.RATE_LIMITED({ detail: `${detail}${suffix}`, ...overrides })
  }
  if (status === 403) return githubToolsErrors.FORBIDDEN({ detail, ...overrides })
  return error
}

/** `{ code, message, why, fix }` projection of an EvlogError for model-facing payloads. */
export function toModelErrorPayload(error: EvlogError): Record<string, string> {
  return {
    ...(error.code ? { code: error.code } : {}),
    message: error.message,
    ...(error.why ? { why: error.why } : {}),
    ...(error.fix ? { fix: error.fix } : {}),
  }
}

export { EvlogError }
