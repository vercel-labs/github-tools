import { isGithubWriteToolName } from './catalog'
import { githubToolsErrors } from './errors'
import { getCollaboratorPermissionCore } from './repository'
import { createGithubTokenResolver, type GithubTokenCall, type GithubTokenInput, type GithubTokenResolver } from './token'

/** GitHub's repository roles, lowest first. */
export const GITHUB_ROLES = ['read', 'triage', 'write', 'maintain', 'admin'] as const

export type GithubRole = typeof GITHUB_ROLES[number]

/**
 * Rank of an answer from GitHub's collaborator permission endpoint in {@link GITHUB_ROLES}, or `-1`
 * without access. A custom role ranks as the base permission GitHub reports for it.
 */
export function githubRoleRank({ permission, roleName }: { permission: string, roleName?: string }): number {
  const role = GITHUB_ROLES.indexOf(roleName as GithubRole)
  return role >= 0 ? role : GITHUB_ROLES.indexOf(permission as GithubRole)
}

/** A person the tools act for with a token that isn't theirs, such as a GitHub App's. */
export type GithubCaller = {
  /** Their GitHub login. */
  login: string
  /**
   * The repository they asked from. A call without a repository target, such as a search, gets a
   * token for this repository instead of one for the whole installation.
   */
  repository?: { owner: string, repo: string }
}

// A role is read on every call, so an agent turn would otherwise ask GitHub the same question many times.
const ROLE_TTL_MS = 60_000
const MAX_CACHED_ROLES = 500
const roles = new Map<string, { expires: number, rank: Promise<number> }>()

function callerRank(resolve: GithubTokenResolver, login: string, owner: string, repo: string): Promise<number> {
  const key = `${login}\n${owner}/${repo}`.toLowerCase()
  const cached = roles.get(key)
  if (cached && cached.expires > Date.now()) return cached.rank
  const input = { owner, repo, username: login }
  const rank = resolve({ toolName: 'getCollaboratorPermission', input, owner, repo })
    .then(token => getCollaboratorPermissionCore({ token, ...input }))
    .then(githubRoleRank)
  roles.set(key, { expires: Date.now() + ROLE_TTL_MS, rank })
  rank.catch(() => roles.delete(key))
  if (roles.size > MAX_CACHED_ROLES) roles.delete(roles.keys().next().value!)
  return rank
}

const describeRank = (rank: number) => rank < 0 ? 'no' : GITHUB_ROLES[rank]

/**
 * Why `caller` may not make a call, or `undefined` when they may. A read needs the Read role on the
 * target repository and a write needs Write, which is stricter than GitHub for the writes a reader
 * can make, such as a comment. `addSubIssue` also needs Read on the sub-issue's repository.
 * `createRepository` and `forkRepository` are refused, since no repository role covers them.
 */
export async function githubCallerViolation(call: GithubTokenCall, caller: GithubCaller, token: GithubTokenInput | undefined): Promise<string | undefined> {
  if (call.toolName === 'createRepository' || call.toolName === 'forkRepository') {
    return `\`${call.toolName}\` creates a repository, which no role on a repository allows, so it can't run for ${caller.login}.`
  }
  if (!call.owner || !call.repo) return undefined
  const resolve = createGithubTokenResolver(token)
  const { subIssueRepo } = call.input as Record<string, unknown>
  const targets: [repo: string, role: GithubRole][] = [[call.repo, isGithubWriteToolName(call.toolName) ? 'write' : 'read']]
  if (call.toolName === 'addSubIssue' && typeof subIssueRepo === 'string') targets.push([subIssueRepo, 'read'])
  for (const [repo, role] of targets) {
    const rank = await callerRank(resolve, caller.login, call.owner, repo)
    if (rank < GITHUB_ROLES.indexOf(role)) return `${caller.login} has ${describeRank(rank)} access to ${call.owner}/${repo}, and \`${call.toolName}\` needs ${role} access.`
  }
  return undefined
}

/**
 * Wrap a token so every call it resolves for is first checked against what `caller` may do on the
 * call's target repository, read from GitHub with that same token. Use it when the tools run with a
 * GitHub App's token for a person who can't get their own, such as someone commenting on GitHub: the
 * App then does nothing that person couldn't. A refused call throws `github_tools.CALLER_FORBIDDEN`
 * before any other request reaches GitHub.
 */
export function withGithubCallerAccess(token: GithubTokenInput | undefined, caller: GithubCaller): GithubTokenResolver {
  const resolve = createGithubTokenResolver(token)
  return async (call) => {
    if (!call) throw new Error('`withGithubCallerAccess` needs the tool call to check the caller\'s access.')
    const reason = await githubCallerViolation(call, caller, resolve)
    if (reason) throw githubToolsErrors.CALLER_FORBIDDEN({ reason })
    return resolve(call.owner && call.repo ? call : { ...call, ...caller.repository })
  }
}
