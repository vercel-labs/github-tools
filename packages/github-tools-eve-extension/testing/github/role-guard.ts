import type { AppEnv, Hono, Store } from '@emulators/core'
import type { GitHubRepo, GitHubStore, GitHubUser } from '@emulators/github'
import { getGitHubStore } from '../emulators.js'
import { forbiddenForRole, replaceBody, ROLE_RANK, roleRank, type Ctx, type Role } from './access.js'

interface RuleInput {
  gh: GitHubStore
  repo: GitHubRepo
  user: GitHubUser
  /** The capture groups of the rule's path. */
  match: RegExpExecArray
  /** The request's JSON object, or an empty one when it has no JSON body. */
  body: () => Promise<Record<string, unknown>>
}

interface Rule {
  methods: string[]
  /** Matched against the path after `/repos/{owner}/{repo}`. */
  path: RegExp
  /** The role a personal token needs, or a function for routes where the author may act on their own item. */
  needs?: Role | ((input: RuleInput) => Role | undefined | Promise<Role | undefined>)
  /**
   * Body fields GitHub ignores from a person below Triage. It answers the request with its
   * success status and leaves these as they were, so the guard removes them and lets it through.
   */
  drop?: string[]
}

const authored = (items: Array<{ repo_id: number, number: number, user_id: number }>, { repo, user, match }: RuleInput) =>
  items.some(item => item.repo_id === repo.id && item.number === Number(match[1]) && item.user_id === user.id)

const ownComment = ({ gh, repo, user, match }: RuleInput) => {
  const comment = gh.comments.get(Number(match[1]))
  return comment?.repo_id === repo.id && comment.user_id === user.id ? undefined : 'write' as const
}

// "Only users with push access can set labels for new issues. Labels are silently dropped otherwise", and the
// same for assignees and the milestone, on creating and on updating an issue. Triage is the lowest role with that access.
const TRIAGE_FIELDS = ['labels', 'assignees', 'milestone']
const AUTHOR_PULL_FIELDS = new Set(['title', 'body', 'state', 'base', 'maintainer_can_modify'])

/**
 * The role a personal token needs on each write route. emulate 0.13.1 checks it for contents,
 * refs, and admin routes only, so a reader could label, close, merge, and release. Routes absent
 * here are either checked by emulate or open to anyone who can read the repository, as on GitHub:
 * opening a pull request, commenting, reviewing, reacting, and forking.
 *
 * GitHub refuses most of these with `403`. On the issue routes with `drop`, it accepts the request
 * and ignores what the person may not set, and the guard does the same.
 */
const RULES: Rule[] = [
  { methods: ['POST', 'PUT', 'DELETE'], path: /^\/issues\/\d+\/labels(?:\/.+)?$/u, needs: 'triage' },
  // "Only users with push access can add assignees to an issue. Assignees are silently ignored otherwise."
  { methods: ['POST', 'DELETE'], path: /^\/issues\/\d+\/assignees$/u, drop: ['assignees'] },
  { methods: ['POST'], path: /^\/issues$/u, drop: TRIAGE_FIELDS },
  { methods: ['PUT', 'DELETE'], path: /^\/issues\/\d+\/lock$/u, needs: 'triage' },
  { methods: ['POST', 'DELETE'], path: /^\/pulls\/\d+\/requested_reviewers$/u, needs: 'triage' },
  {
    methods: ['PATCH'],
    path: /^\/issues\/(\d+)$/u,
    // "Issue owners and users with push access or Triage role can edit an issue."
    needs: input => authored(input.gh.issues.findBy('repo_id', input.repo.id), input) ? undefined : 'triage',
    drop: TRIAGE_FIELDS,
  },
  {
    methods: ['PATCH'],
    path: /^\/pulls\/(\d+)$/u,
    needs: async (input) => {
      const fields = Object.keys(await input.body())
      if (authored(input.gh.pullRequests.findBy('repo_id', input.repo.id), input) && fields.every(field => AUTHOR_PULL_FIELDS.has(field))) return undefined
      return fields.every(field => field === 'state') ? 'triage' : 'write'
    },
  },
  { methods: ['PATCH', 'DELETE'], path: /^\/issues\/comments\/(\d+)$/u, needs: ownComment },
  { methods: ['PATCH', 'DELETE'], path: /^\/pulls\/comments\/(\d+)$/u, needs: ownComment },
  { methods: ['POST'], path: /^\/labels$/u, needs: 'write' },
  { methods: ['PATCH', 'DELETE'], path: /^\/labels\/.+$/u, needs: 'write' },
  { methods: ['POST'], path: /^\/milestones$/u, needs: 'write' },
  { methods: ['PATCH', 'DELETE'], path: /^\/milestones\/\d+$/u, needs: 'write' },
  { methods: ['PUT'], path: /^\/pulls\/\d+\/(?:merge|update-branch)$/u, needs: 'write' },
  { methods: ['PUT'], path: /^\/pulls\/\d+\/reviews\/\d+\/dismissals$/u, needs: 'write' },
  { methods: ['POST'], path: /^\/releases(?:\/generate-notes|\/\d+\/assets)?$/u, needs: 'write' },
  { methods: ['PATCH', 'DELETE'], path: /^\/releases\/(?:assets\/)?\d+$/u, needs: 'write' },
  { methods: ['POST'], path: /^\/actions\/workflows\/[^/]+\/dispatches$/u, needs: 'write' },
  { methods: ['PUT'], path: /^\/actions\/workflows\/[^/]+\/(?:enable|disable)$/u, needs: 'write' },
  { methods: ['POST'], path: /^\/actions\/runs\/\d+\/(?:cancel|rerun)$/u, needs: 'write' },
  { methods: ['DELETE'], path: /^\/actions\/(?:runs|artifacts)\/\d+$/u, needs: 'write' },
  { methods: ['POST'], path: /^\/check-(?:runs|suites)(?:\/\d+\/rerequest)?$/u, needs: 'write' },
  { methods: ['PATCH'], path: /^\/check-(?:runs\/\d+|suites\/preferences)$/u, needs: 'write' },
]

/**
 * Registered before emulate's routes. Answers `401` to a token that resolves to no user and no
 * App, which `createServer` would treat as anonymous, and `403` to a personal token below the
 * role a write route needs. Where GitHub ignores fields instead of refusing, it removes them.
 */
export function registerRoleGuard(app: Hono<AppEnv>, store: Store): void {
  const gh = getGitHubStore(store)
  app.use('*', async (c: Ctx, next) => {
    if (c.req.header('authorization') && !c.get('authUser') && !c.get('authApp')) return c.json({ message: 'Bad credentials' }, 401)
    await next()
  })
  // emulate's router has no trailing wildcard: a param with a regex is how a pattern takes the rest of a path.
  app.use('/repos/:owner/:repo/:rest{.+}', async (c: Ctx, next) => {
    const auth = c.get('authUser')
    if (!auth || auth.installation || c.req.method === 'GET') return next()
    const repo = gh.repos.findOneBy('full_name', `${c.req.param('owner')}/${c.req.param('repo')}`)
    const user = gh.users.findOneBy('login', auth.login)
    if (!repo || !user) return next()
    const path = c.req.path.slice(`/repos/${c.req.param('owner')}/${c.req.param('repo')}`.length)
    const rank = roleRank(gh, user, repo)
    const body = () => c.req.raw.clone().json().catch(() => ({})) as Promise<Record<string, unknown>>
    for (const rule of RULES) {
      const match = rule.methods.includes(c.req.method) ? rule.path.exec(path) : null
      if (!match) continue
      const needs = typeof rule.needs === 'function' ? await rule.needs({ gh, repo, user, match, body }) : rule.needs
      if (needs && rank < ROLE_RANK[needs]) throw forbiddenForRole()
      if (rule.drop && rank < ROLE_RANK.triage) {
        const sent = await body()
        if (rule.drop.some(field => field in sent)) replaceBody(c, Object.fromEntries(Object.entries(sent).filter(([field]) => !rule.drop!.includes(field))))
      }
      break
    }
    return next()
  })
}
