import { hasRepositoryTarget } from './catalog'
import { githubToolsErrors } from './errors'
import type { GithubToolName } from './tool-names'

/**
 * The tool call a token is requested for. Passed to token providers so they
 * can mint a token for the call's target — e.g. the GitHub App installation
 * that owns `owner/repo`.
 */
export type GithubTokenCall = {
  toolName: GithubToolName
  /** Tool input after context defaults are applied. */
  input: unknown
  /** Target repository owner. Undefined for tools without a repository target (search, gists, notifications). */
  owner?: string
  /** Target repository name. Undefined for tools without a repository target. */
  repo?: string
}

/**
 * A token string, or an async provider. Providers receive the tool call the
 * token is requested for; `call` is undefined when the token is resolved
 * outside a tool call.
 */
export type GithubTokenInput = string | ((call?: GithubTokenCall) => Promise<string>)
export type GithubTokenResolver = (call?: GithubTokenCall) => Promise<string>

/**
 * Build the {@link GithubTokenCall} for a tool from its resolved input.
 * Context merging also adds `owner` / `repo` to tools without those inputs,
 * so they only count as a target when the tool's schema declares them.
 */
export function githubTokenCall(toolName: GithubToolName, input: Record<string, unknown>): GithubTokenCall {
  if (!hasRepositoryTarget(toolName)) return { toolName, input }
  const { owner, repo } = input
  return {
    toolName,
    input,
    ...(typeof owner === 'string' && { owner }),
    ...(typeof repo === 'string' && { repo }),
  }
}

/**
 * Normalizes a token string, async token provider, or `process.env.GITHUB_TOKEN`
 * into a `(call?) => Promise<string>` resolver.
 *
 * Throws immediately for static inputs when no token is available. Provider
 * functions are validated lazily, each time the resolver is invoked.
 */
export function createGithubTokenResolver(token?: GithubTokenInput): GithubTokenResolver {
  if (typeof token === 'function') {
    return async (call) => {
      const resolvedToken = await token(call)
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

/** Resolves a {@link GithubTokenInput} to a token string for an optional tool call. */
export function resolveGithubToken(token?: GithubTokenInput, call?: GithubTokenCall): Promise<string> {
  return createGithubTokenResolver(token)(call)
}
