import type {
  ApprovalResponsePolicy,
  ToolAuthProvider,
} from 'eve/tools'
import { createOctokit } from '../client'
import type { GithubTokenInput } from '../core/token'
import { resolveGithubToken } from '../core/token'

export type GithubRepositoryApproverOptions = {
  /** User-scoped provider used only to identify the authenticated responder. */
  auth: ToolAuthProvider
  /** Agent credential used to read repository policy. Defaults to GITHUB_TOKEN. */
  agentToken?: GithubTokenInput
  /** Minimum GitHub repository permission required to settle an approval. */
  minimumPermission?: 'read' | 'triage' | 'write' | 'maintain' | 'admin'
}

export const PERMISSION_RANK = {
  none: 0,
  read: 1,
  triage: 2,
  write: 3,
  maintain: 4,
  admin: 5,
} as const

/** Convert GitHub's collaborator permission flags into the policy permission. */
export function normalizeGithubPermission(permissions: {
  admin?: boolean
  maintain?: boolean
  push?: boolean
  triage?: boolean
  pull?: boolean
} | undefined): keyof typeof PERMISSION_RANK {
  if (permissions?.admin) return 'admin'
  if (permissions?.maintain) return 'maintain'
  if (permissions?.push) return 'write'
  if (permissions?.triage) return 'triage'
  if (permissions?.pull) return 'read'
  return 'none'
}

/**
 * Authorizes a response when its GitHub user has the configured repository permission.
 * Tool inputs must contain `owner` and `repo`; tools without repository semantics reject.
 */
export function githubRepositoryApprover(
  options: GithubRepositoryApproverOptions,
): ApprovalResponsePolicy {
  const minimumPermission = options.minimumPermission ?? 'write'

  return async ({ auth, request }) => {
    const owner = request.toolInput?.owner
    const repo = request.toolInput?.repo
    if (typeof owner !== 'string' || typeof repo !== 'string') {
      return {
        status: 'rejected',
        reason: 'This GitHub action does not identify a repository and cannot use repository approver policy.',
      }
    }

    const { token: userToken } = await auth.getToken(options.auth, {
      authKey: 'github-approver',
      displayName: 'GitHub',
    })
    const userClient = createOctokit(userToken)
    const { data: user } = await userClient.rest.users.getAuthenticated()

    const agentClient = createOctokit(await resolveGithubToken(options.agentToken))
    try {
      const { data } = await agentClient.rest.repos.getCollaboratorPermissionLevel({
        owner,
        repo,
        username: user.login,
      })
      const permission = normalizeGithubPermission(data.user?.permissions)
      if (PERMISSION_RANK[permission] >= PERMISSION_RANK[minimumPermission]) {
        return { status: 'allowed' }
      }
    }
    catch (error) {
      const status = (error as { status?: unknown }).status
      if (status !== 404) throw error
    }

    return {
      status: 'rejected',
      reason: `Your GitHub account does not have ${minimumPermission} permission for ${owner}/${repo}.`,
    }
  }
}
