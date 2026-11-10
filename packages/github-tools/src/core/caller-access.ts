import { createOctokit } from '../client'
import { isGithubWriteToolName } from './catalog'
import { EvlogError, githubToolsErrors } from './errors'
import { getCollaboratorPermissionCore } from './repository'
import { createGithubTokenResolver, type GithubTokenInput, type GithubTokenResolver } from './token'
import type { GithubToolName } from './tool-names'

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

type Repository = { owner: string, repo: string }

/** A person the tools act for with a token that isn't theirs, such as a GitHub App's. */
export type GithubCaller = {
  /** Their GitHub login. */
  login: string
  /** The repository they asked from. A search runs only when its token reaches this repository and no other. */
  repository?: Repository
}

// A role is read on every call, so an agent turn would otherwise ask GitHub the same question many times.
const ROLE_TTL_MS = 60_000
const MAX_CACHED_ROLES = 500
const roles = new Map<string, { expires: number, rank: Promise<number> }>()

function callerRank(resolve: GithubTokenResolver, login: string, { owner, repo }: Repository): Promise<number> {
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

const refusal = (reason: string) => githubToolsErrors.CALLER_FORBIDDEN({ reason })

async function requireRole(resolve: GithubTokenResolver, login: string, toolName: GithubToolName, repository: Repository, role: GithubRole) {
  const rank = await callerRank(resolve, login, repository)
  if (rank < GITHUB_ROLES.indexOf(role)) {
    throw refusal(`${login} has ${rank < 0 ? 'no' : GITHUB_ROLES[rank]} access to ${repository.owner}/${repository.repo}, and \`${toolName}\` needs ${role} access.`)
  }
}

const REVIEW_THREAD_REPOSITORY = /* GraphQL */ `
  query ReviewThreadRepository($threadId: ID!) {
    node(id: $threadId) {
      ... on PullRequestReviewThread {
        repository {
          name
          owner {
            login
          }
        }
      }
    }
  }
`

async function reviewThreadRepository(token: string, threadId: unknown): Promise<Repository | undefined> {
  const data = await createOctokit(token).graphql<{ node: { repository?: { name: string, owner: { login: string } } } | null }>(REVIEW_THREAD_REPOSITORY, { threadId })
  const repository = data.node?.repository
  return repository && { owner: repository.owner.login, repo: repository.name }
}

// A search has no target to check a role on, so it may only run with a token that sees one repository.
// Only an installation token can list what it reaches: GitHub answers 403 or 404 to any other.
async function reachesOnly(token: string, { owner, repo }: Repository): Promise<boolean> {
  try {
    const { data } = await createOctokit(token).rest.apps.listReposAccessibleToInstallation({ per_page: 2 })
    return data.total_count === 1 && data.repositories[0]?.full_name.toLowerCase() === `${owner}/${repo}`.toLowerCase()
  } catch (error) {
    if (EvlogError.isEvlogError(error) && (error.status === 403 || error.status === 404)) return false
    throw error
  }
}

const SEARCH_TOOLS: ReadonlySet<GithubToolName> = new Set(['searchCode', 'searchIssues', 'searchRepositories'])

/**
 * Wrap a token so every call it resolves for is first checked against what `caller` may do, read
 * from GitHub with that same token. Use it when the tools run with a GitHub App's token for a person
 * who can't get their own, such as someone commenting on GitHub: the App then does nothing that
 * person couldn't. A refused call throws `github_tools.CALLER_FORBIDDEN` before it reaches GitHub.
 *
 * - A call on a repository needs the Read role there for a read and Write for a write, which is
 *   stricter than GitHub for the writes a reader can make, such as a comment. `addSubIssue` also
 *   needs Read on the sub-issue's repository.
 * - `resolveReviewThread` needs Write on the repository the thread is in.
 * - A search needs `caller.repository`, the Read role there, and a token that reaches that
 *   repository and no other, so it can't return results from one the caller can't see.
 * - Every other call without a repository is refused, since no role on a repository covers it:
 *   gists, notifications, `createRepository` and `forkRepository`.
 */
export function withGithubCallerAccess(token: GithubTokenInput | undefined, caller: GithubCaller): GithubTokenResolver {
  const resolve = createGithubTokenResolver(token)
  const { login } = caller
  return async (call) => {
    if (!call) throw new Error('`withGithubCallerAccess` needs the tool call to check the caller\'s access.')
    const { toolName } = call
    if (toolName === 'createRepository' || toolName === 'forkRepository') {
      throw refusal(`\`${toolName}\` creates a repository, which no role on a repository allows, so it can't run for ${login}.`)
    }
    if (call.owner && call.repo) {
      const { owner } = call
      await requireRole(resolve, login, toolName, { owner, repo: call.repo }, isGithubWriteToolName(toolName) ? 'write' : 'read')
      const { subIssueRepo } = call.input as Record<string, unknown>
      if (toolName === 'addSubIssue' && typeof subIssueRepo === 'string') await requireRole(resolve, login, toolName, { owner, repo: subIssueRepo }, 'read')
      return resolve(call)
    }
    if (toolName === 'resolveReviewThread') {
      const { threadId } = call.input as Record<string, unknown>
      const repository = await reviewThreadRepository(await resolve({ ...call, ...caller.repository }), threadId)
      if (!repository) throw refusal(`The review thread can't be found, so ${login}'s role on its repository can't be checked.`)
      await requireRole(resolve, login, toolName, repository, 'write')
      return resolve({ ...call, ...repository })
    }
    if (SEARCH_TOOLS.has(toolName) && caller.repository) {
      const { owner, repo } = caller.repository
      await requireRole(resolve, login, toolName, caller.repository, 'read')
      const scoped = await resolve({ ...call, owner, repo })
      if (!await reachesOnly(scoped, caller.repository)) {
        throw refusal(`\`${toolName}\` would search every repository the agent's token reaches, not only ${owner}/${repo}, and ${login}'s role can't be checked on all of them.`)
      }
      return scoped
    }
    throw refusal(`\`${toolName}\` names no repository, so ${login}'s role can't be checked for it.`)
  }
}
