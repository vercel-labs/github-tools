import { GITHUB_ROLES, githubRoleRank, type GithubRole } from '@github-tools/sdk/eve-runtime'
import {
  defaultGitHubAuth,
  GitHubApiError,
  githubChannel as eveGithubChannel,
  type GitHubChannel,
  type GitHubChannelConfig,
  type GitHubComment,
  type GitHubInboundContext,
} from 'eve/channels/github'

/**
 * Who the agent answers on GitHub, named after GitHub's repository roles. Each value means the
 * people with that role and everyone above them: `'writers'` is Write, Maintain and Admin.
 */
export type GithubRespondTo = 'anyone' | 'triagers' | 'writers' | 'maintainers' | 'admins'

const MINIMUM_ROLE = {
  triagers: 'triage',
  writers: 'write',
  maintainers: 'maintain',
  admins: 'admin',
} as const satisfies Record<Exclude<GithubRespondTo, 'anyone'>, GithubRole>

/** eve's `githubChannel` config, plus {@link GithubChannelConfig.respondTo}. */
export interface GithubChannelConfig extends GitHubChannelConfig {
  /**
   * Who may reach the agent with a comment. The commenter's role on the thread's repository is
   * checked before the comment starts or continues a turn, so a comment from anyone below it does
   * nothing: no reaction, no session, no model call.
   *
   * - `'anyone'` (default): anyone who can comment, which on a public repository is every GitHub user.
   * - `'triagers'`, `'writers'`, `'maintainers'`, `'admins'`: that role and everyone above it.
   *
   * It applies to comments only: `onIssue`, `onPullRequest` and the CI hooks decide for themselves.
   * With your own `onComment`, the role is checked for the comments it dispatches.
   */
  readonly respondTo?: GithubRespondTo
}

type BotName = GitHubChannelConfig['botName']

async function resolveBotName(name: BotName): Promise<string | undefined> {
  return (typeof name === 'function' ? await name() : name)?.trim() || undefined
}

// Same rule as eve's default gate, which it doesn't export: skip eve's own comments and other
// bots, and need `@botName` followed by a character that can't continue a login.
function mentionsBot(comment: GitHubComment, botName: string | undefined): boolean {
  if (!botName || comment.body.includes('<!-- eve:github:')) return false
  if (comment.author?.type === 'Bot' || comment.author?.login.toLowerCase() === `${botName}[bot]`.toLowerCase()) return false
  return new RegExp(`@${botName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?=$|[^A-Za-z0-9_-])`, 'iu').test(comment.body)
}

async function commenterRank(ctx: GitHubInboundContext): Promise<number> {
  try {
    const { body } = await ctx.github.request<{ permission: string, role_name?: string }>({
      method: 'GET',
      path: `/repos/${ctx.repository.fullName}/collaborators/${encodeURIComponent(ctx.sender.login)}/permission`,
    })
    return githubRoleRank({ permission: body.permission, roleName: body.role_name })
  } catch (error) {
    // GitHub answers 404 for a sender that is not a user account.
    if (error instanceof GitHubApiError && error.status === 404) return -1
    throw error
  }
}

/**
 * eve's `githubChannel` with `respondTo`, which limits who can reach the agent with a comment to
 * the people with a role on the repository. Every other option is eve's and passes through.
 *
 * ```ts
 * // agent/channels/github.ts
 * import { connectGitHubCredentials } from '@vercel/connect/eve'
 * import { githubChannel } from '@github-tools/eve-extension/channels'
 *
 * export default githubChannel({
 *   credentials: connectGitHubCredentials('github/my-connector'),
 *   respondTo: 'writers',
 * })
 * ```
 */
export function githubChannel({ respondTo = 'anyone', ...config }: GithubChannelConfig = {}): GitHubChannel {
  if (respondTo === 'anyone') return eveGithubChannel(config)
  const minimum = GITHUB_ROLES.indexOf(MINIMUM_ROLE[respondTo])
  const { onComment } = config
  const botName = config.botName ?? config.credentials?.appSlug ?? process.env.GITHUB_APP_SLUG
  return eveGithubChannel({
    ...config,
    async onComment(ctx, comment) {
      const result = onComment
        ? await onComment(ctx, comment)
        : mentionsBot(comment, await resolveBotName(botName)) ? { auth: defaultGitHubAuth(ctx) } : null
      if (!result) return null
      return await commenterRank(ctx) >= minimum ? result : null
    },
  })
}
