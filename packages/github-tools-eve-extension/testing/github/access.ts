import type { AppEnv, Context } from '@emulators/core'
import type { GitHubRepo, GitHubStore, GitHubUser } from '@emulators/github'
import { ApiError } from '../emulators.js'

export type Ctx = Context<AppEnv>

/** GitHub's repository roles, lowest first. */
export type Role = 'read' | 'triage' | 'write' | 'maintain' | 'admin'

export const ROLE_RANK: Record<Role, number> = { read: 1, triage: 2, write: 3, maintain: 4, admin: 5 }

/** emulate stores a collaborator's role under GitHub's legacy permission names. */
export const ROLE_PERMISSION = { read: 'pull', triage: 'triage', write: 'push', maintain: 'maintain', admin: 'admin' } as const satisfies Record<Role, string>

const PERMISSION_ROLE: Record<string, Role> = { pull: 'read', triage: 'triage', push: 'write', maintain: 'maintain', admin: 'admin' }

export function findRepo(gh: GitHubStore, owner: string, name: string): GitHubRepo {
  const repo = gh.repos.findOneBy('full_name', `${owner}/${name}`)
  if (!repo) throw new ApiError(404, 'Not Found')
  return repo
}

function isOrgMember(gh: GitHubStore, userId: number, orgId: number): boolean {
  return gh.teams.findBy('org_id', orgId).some(team => gh.teamMembers.findBy('team_id', team.id).some(member => member.user_id === userId))
}

/**
 * Rank of a person's role on a repository, 0 when they can't see it. Follows emulate's own
 * `computeRepoPermissions`, so it agrees with what `GET .../collaborators/{user}/permission` reports.
 */
export function roleRank(gh: GitHubStore, user: GitHubUser, repo: GitHubRepo): number {
  if (repo.owner_type === 'User' && repo.owner_id === user.id) return ROLE_RANK.admin
  if (repo.owner_type === 'Organization' && isOrgMember(gh, user.id, repo.owner_id)) return ROLE_RANK.admin
  const collaborator = gh.collaborators.findBy('repo_id', repo.id).find(entry => entry.user_id === user.id)
  if (collaborator) return ROLE_RANK[PERMISSION_ROLE[collaborator.permission]!]
  return repo.private ? 0 : ROLE_RANK.read
}

/** What the emulator answers a personal token below the role a request needs. */
export const ROLE_REFUSAL = 'Resource not accessible by personal access token'

export const forbiddenForRole = () => new ApiError(403, ROLE_REFUSAL)

// emulate's `installationActor`, which it doesn't export: the App's bot user, created on first use.
function installationBot(gh: GitHubStore, appId: number): GitHubUser {
  const app = gh.apps.all().find(entry => entry.app_id === appId)
  const login = `${app?.slug ?? `app-${appId}`}[bot]`
  const existing = gh.users.findOneBy('login', login)
  if (existing) return existing
  const bot = gh.users.insert({
    login,
    node_id: '',
    avatar_url: '',
    gravatar_id: '',
    type: 'Bot',
    site_admin: false,
    name: app?.name ?? 'GitHub App',
    company: null,
    blog: '',
    location: null,
    email: `${appId}+${login}@users.noreply.github.com`,
    hireable: null,
    bio: null,
    twitter_username: null,
    public_repos: 0,
    public_gists: 0,
    followers: 0,
    following: 0,
  })
  return gh.users.update(bot.id, { node_id: Buffer.from(`0:Bot${bot.id}`).toString('base64').replace(/=+$/u, '') })!
}

export interface Requirement {
  /** The GitHub App permission an installation token needs, such as `issues`. Any one of several is enough. */
  permission: string | string[]
  access: 'read' | 'write'
  /** The lowest repository role a personal token needs. */
  role: Role
}

/**
 * Who is calling, once they are allowed to. Repeats emulate's `assertRepoPermission` for an
 * installation token and adds the role check emulate skips for a personal token.
 */
export function requireActor(c: Ctx, gh: GitHubStore, repo: GitHubRepo, { permission, access, role }: Requirement): GitHubUser {
  const auth = c.get('authUser')
  if (!auth) throw new ApiError(401, 'Requires authentication')
  if (auth.installation) {
    const { installation } = auth
    const reaches = repo.owner_id === installation.accountId && repo.owner_type === installation.accountType
      && (installation.repositorySelection === 'all' || installation.repositoryIds.includes(repo.id))
    const granted = [permission].flat().some((name) => {
      const level = installation.permissions[name]
      return access === 'write' ? level === 'write' : level === 'read' || level === 'write'
    })
    if (!reaches || !granted) throw new ApiError(403, 'Resource not accessible by integration')
    return installationBot(gh, installation.appId)
  }
  const user = gh.users.findOneBy('login', auth.login)
  if (!user) throw new ApiError(401, 'Bad credentials')
  const rank = roleRank(gh, user, repo)
  if (rank === 0) throw new ApiError(404, 'Not Found')
  if (rank < ROLE_RANK[role]) throw forbiddenForRole()
  return user
}

/** A read anyone may make on a public repository, and only someone with access on a private one. */
export function requireRead(c: Ctx, gh: GitHubStore, repo: GitHubRepo, permission: string): void {
  if (!repo.private && !c.get('authUser')?.installation) return
  requireActor(c, gh, repo, { permission, access: 'read', role: 'read' })
}

/** A personal token's user. Gists and notifications belong to a user, so an installation token can't use them. */
export function requireUser(c: Ctx, gh: GitHubStore): GitHubUser {
  const auth = c.get('authUser')
  if (!auth) throw new ApiError(401, 'Requires authentication')
  if (auth.installation) throw new ApiError(403, 'Resource not accessible by integration')
  const user = gh.users.findOneBy('login', auth.login)
  if (!user) throw new ApiError(401, 'Bad credentials')
  return user
}

/** Replaces a request's JSON body. emulate reads the body from `c.req.raw`, so the route receives the new one. */
export function replaceBody(c: Ctx, body: unknown): void {
  const headers = new Headers(c.req.raw.headers)
  headers.set('content-type', 'application/json')
  ;(c.req as { raw: Request }).raw = new Request(c.req.raw.url, { method: c.req.method, headers, body: JSON.stringify(body) })
}

export const briefUser = (user: GitHubUser | undefined) => user ? { login: user.login, id: user.id, node_id: user.node_id, type: user.type, site_admin: user.site_admin } : null

export function paginate<T>(c: Ctx, items: T[]): T[] {
  const perPage = Math.min(Number(c.req.query('per_page') ?? 30) || 30, 100)
  const page = Math.max(Number(c.req.query('page') ?? 1) || 1, 1)
  return items.slice((page - 1) * perPage, page * perPage)
}
