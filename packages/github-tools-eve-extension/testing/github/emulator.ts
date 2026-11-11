import { once } from 'node:events'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createSign, randomBytes } from 'node:crypto'
import type { AppEnv, Hono, ServicePlugin, Store, TokenMap, WebhookDispatcher } from '@emulators/core'
import type { GitHubPullRequest, GitHubRepo, GitHubSeedConfig, GitHubStore } from '@emulators/github'
import { createAppKeyResolver, createServer, getGitHubStore, githubPlugin, prepareSeed, seedFromConfig, serve } from '../emulators.js'
import { ROLE_PERMISSION, type Role } from './access.js'
import { registerRequestFixes, type ChangedFile } from './fixes.js'
import { registerRoleGuard } from './role-guard.js'
import { fixWebhookPayloads, registerSupplementRoutes, type SecurityAlertSeeds } from './supplement/index.js'

export type { Role } from './access.js'
export type { CodeScanningAlertSeed, DependabotAlertSeed, SecretScanningAlertSeed, SecurityAlertSeeds } from './supplement/security.js'

/** A repository to create before the first eval, with a README on its default branch. */
export interface RepositorySeed {
  private?: boolean
  /** Names of the labels the repository starts with. */
  labels?: string[]
  /** Workflow file names under `.github/workflows`, such as `ci.yml`. emulate has no route that creates a workflow. */
  workflows?: string[]
  /** Security alerts the repository lists. */
  alerts?: SecurityAlertSeeds
}

/** A person, who is a GitHub user and, once they sign in, the user behind an eve principal with the same name. */
export interface PersonSeed {
  /** Their role on every seeded repository. Without one they are a GitHub user with no role. */
  role?: Role
  /** `false` for a person who hasn't connected GitHub through Vercel Connect yet. */
  authorized?: boolean
}

export interface GithubEmulatorOptions {
  /** Repositories by full name, such as `acme/web`. An owner named in `people` is that user, and any other is an organization. */
  repositories: Record<string, RepositorySeed>
  people?: Record<string, PersonSeed>
  /** Registers the routes emulate lacks. Only the coverage test turns it off, to ask emulate what it answers alone. */
  supplement?: boolean
}

/** One request the emulator answered over HTTP. */
export interface GithubRequest {
  method: string
  path: string
  status: number
  /** The login behind the token, the App's bot for an installation token, `app` for an App JWT, `unknown` for a token the emulator doesn't know, or `anonymous`. */
  actor: string
}

/** The seeded GitHub App, which is installed on every seeded owner with every permission. */
export interface GithubEmulatorApp {
  id: number
  slug: string
  privateKey: string
  webhookSecret: string
  /** Installation IDs by owner. */
  installations: Record<string, number>
}

const ADMIN = 'emulator-admin'
const APP_ID = 1
const APP_SLUG = 'eve-agent'
const APP_PERMISSIONS = {
  actions: 'write',
  administration: 'write',
  checks: 'write',
  contents: 'write',
  discussions: 'write',
  issues: 'write',
  metadata: 'read',
  pull_requests: 'write',
  secret_scanning_alerts: 'read',
  security_events: 'read',
  statuses: 'write',
  vulnerability_alerts: 'read',
  workflows: 'write',
}

export type GithubEmulator = Awaited<ReturnType<typeof startGithubEmulator>>

/**
 * Starts emulate's GitHub service on a loopback port with the role guard and the supplement.
 * `createEmulator` from `emulate` only takes a built-in service, so this owns what it does around
 * `createServer`: preparing the seed, resolving App keys, `reset()`, and listening.
 */
export async function startGithubEmulator({ repositories, people = {}, supplement = true }: GithubEmulatorOptions) {
  const requests: GithubRequest[] = []
  const unknownDocuments: string[] = []
  const supplementRoutes: Array<{ method: string, path: string }> = []
  const tokenLogins = new Map<string, string>()
  const webhookSecret = randomBytes(24).toString('hex')
  const owners = [...new Set(Object.keys(repositories).map(name => name.split('/')[0]!))]
  const installations = Object.fromEntries(owners.map((owner, index) => [owner, 1000 + index]))
  let parts: ReturnType<typeof registerSupplementRoutes> | undefined
  let ids = 0

  const plugin: ServicePlugin = {
    name: 'github',
    register(app, store, webhooks, baseUrl, tokenMap) {
      const context = { app, store, gh: getGitHubStore(store), webhooks, baseUrl }
      registerRoleGuard(app, store)
      registerRequestFixes(app, store, changedFiles)
      if (supplement) {
        const before = app.routeTable.length
        parts = registerSupplementRoutes(context, unknownDocuments)
        supplementRoutes.push(...app.routeTable.slice(before).map(({ method, path }) => ({ method, path })))
      }
      githubPlugin.register(app, store, webhooks, baseUrl, tokenMap)
      if (parts) fixWebhookPayloads(context, parts.notify)
    },
    seed: githubPlugin.seed,
  }

  function actorOf(request: Request): string {
    const token = request.headers.get('authorization')?.replace(/^(?:bearer|token)\s+/iu, '').trim()
    if (!token) return 'anonymous'
    if (token.startsWith('eyJ')) return 'app'
    const installation = tokenMap.get(token)?.installation
    if (installation) return `${gh.apps.all().find(app => app.app_id === installation.appId)?.slug}[bot]`
    return tokenLogins.get(token) ?? 'unknown'
  }

  // The routes need the server's URL, so it listens first and answers once they exist.
  const server: Server = serve({
    port: 0,
    fetch: async (request) => {
      // emulate allows every origin, so a web page open during a run could call the emulator. Nothing the
      // kit starts sends an `Origin` header: only a browser does.
      const origin = request.headers.get('origin')
      if (origin !== null && origin !== url) return Response.json({ message: 'The GitHub emulator answers no request from another origin.' }, { status: 403 })
      const response = await app.fetch(request)
      requests.push({ method: request.method, path: new URL(request.url).pathname, status: response.status, actor: actorOf(request) })
      return response
    },
  })
  await once(server, 'listening')
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

  const users = [ADMIN, ...Object.keys(people)]
  // Random on every run, the admin's included, so nothing outside the run can act as a seeded person.
  const personalTokens = new Map(users.map(login => [login, `ghp_${randomBytes(20).toString('hex')}`]))
  const prepared = await prepareSeed({
    users: users.map(login => ({ login })),
    orgs: owners.filter(owner => !(owner in people)).map(login => ({ login, members: [{ login: ADMIN, role: 'admin' }] })),
    repos: Object.entries(repositories).map(([fullName, repository]) => {
      const [owner, name] = fullName.split('/')
      return { owner: owner!, name: name!, private: repository.private ?? false, auto_init: true }
    }),
    apps: [{
      app_id: APP_ID,
      slug: APP_SLUG,
      name: 'eve agent',
      permissions: APP_PERMISSIONS,
      // Every event: emulate adds `installation` to a repository webhook's payload only for the events the App subscribes to.
      events: ['*'],
      installations: owners.map(owner => ({ installation_id: installations[owner]!, account: owner, repository_selection: 'all' })),
    }],
  } satisfies GitHubSeedConfig)
  const privateKey = (prepared.config as GitHubSeedConfig).apps![0]!.private_key!

  const { app, store, webhooks, tokenMap }: { app: Hono<AppEnv>, store: Store, webhooks: WebhookDispatcher, tokenMap: TokenMap } = createServer(plugin, {
    baseUrl: url,
    appKeyResolver: appId => createAppKeyResolver(store)(appId),
  })
  const gh: GitHubStore = getGitHubStore(store)

  /** Calls the emulator in process, as a person. Nothing is added to `requests`. */
  async function request<T = unknown>(login: string, method: string, path: string, body?: unknown): Promise<T> {
    const response = await app.request(path, {
      method,
      headers: { 'authorization': `Bearer ${tokenFor(login)}`, 'accept': 'application/vnd.github+json', 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    if (!response.ok) throw new Error(`GitHub emulator: ${method} ${path} as ${login} answered ${response.status}: ${text}`)
    return (text ? JSON.parse(text) : undefined) as T
  }

  function registerToken(token: string, login: string): void {
    const user = gh.users.findOneBy('login', login)
    if (!user) throw new Error(`GitHub emulator: no user "${login}". Seeded people: ${Object.keys(people).join(', ') || 'none'}.`)
    tokenMap.set(token, { login, id: user.id, scopes: ['repo', 'user', 'gist', 'notifications', 'workflow'] })
    tokenLogins.set(token, login)
  }

  function tokenFor(login: string): string {
    const token = personalTokens.get(login)
    if (!token) throw new Error(`GitHub emulator: no person "${login}". Seeded people: ${Object.keys(people).join(', ') || 'none'}.`)
    return token
  }

  // A pull request's diff, which emulate computes on its compare route. The head branch moves when
  // commits are pushed, and emulate keeps the head SHA the pull request was opened with.
  async function changedFiles(repo: GitHubRepo, pull: GitHubPullRequest): Promise<ChangedFile[]> {
    const pushed = pull.head_repo_id === repo.id && gh.branches.findBy('repo_id', repo.id).some(branch => branch.name === pull.head_ref)
    const { files } = await request<{ files: ChangedFile[] }>(adminOf(repo.full_name), 'GET', `/repos/${repo.full_name}/compare/${pull.base_sha}...${pushed ? encodeURIComponent(pull.head_ref) : pull.head_sha}`)
    return files
  }

  /** The admin of a repository or of its owner: the owner for a user's repository, the emulator's own admin for an organization's. */
  const adminOf = (name: string) => {
    const owner = name.split('/')[0]!
    return owner in people ? owner : ADMIN
  }

  async function applyRoles(fullName: string): Promise<void> {
    for (const [login, person] of Object.entries(people)) {
      if (person.role && login !== adminOf(fullName)) {
        await request(adminOf(fullName), 'PUT', `/repos/${fullName}/collaborators/${login}`, { permission: ROLE_PERMISSION[person.role] })
      }
    }
  }

  // emulate's seed has no collaborators or labels, so both are set through its REST routes afterward.
  async function seed(): Promise<void> {
    plugin.seed!(store, url)
    seedFromConfig(store, url, prepared.config as GitHubSeedConfig)
    for (const [login, token] of personalTokens) registerToken(token, login)
    for (const [fullName, repository] of Object.entries(repositories)) {
      await applyRoles(fullName)
      for (const name of repository.labels ?? []) {
        await request(adminOf(fullName), 'POST', `/repos/${fullName}/labels`, { name })
      }
      const repo = gh.repos.findOneBy('full_name', fullName)!
      for (const file of repository.workflows ?? []) {
        const name = file.replace(/\.ya?ml$/u, '')
        const workflow = gh.workflows.insert({ node_id: '', repo_id: repo.id, name, path: `.github/workflows/${file}`, state: 'active', badge_url: `${url}/${fullName}/workflows/${name}/badge.svg` })
        gh.workflows.update(workflow.id, { node_id: `W_${workflow.id}` })
      }
      if (repository.alerts) parts?.seedAlerts(repo, repository.alerts)
    }
  }

  function appJwt(): string {
    const now = Math.floor(Date.now() / 1000)
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
    const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat: now - 60, exp: now + 540, iss: String(APP_ID) })}`
    return `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(privateKey, 'base64url')}`
  }
  await seed()

  return {
    url,
    app,
    store,
    webhooks,
    /** Every request answered over HTTP, in order. In-process calls, such as seeding, aren't recorded. */
    requests,
    /** GraphQL documents the emulator was sent and doesn't answer. */
    unknownDocuments,
    /** The routes this package adds to emulate's. */
    supplementRoutes,
    admin: ADMIN,
    owners,
    people: Object.keys(people),
    /** A number no earlier call returned, for names that have to be unique in a run. */
    nextId: () => ++ids,
    githubApp: { id: APP_ID, slug: APP_SLUG, privateKey, webhookSecret, installations } satisfies GithubEmulatorApp,
    request,
    adminOf,
    applyRoles,
    /** A person's own token, which the emulator knows from the seed. It isn't the one Vercel Connect issues for them. */
    tokenFor,
    /** Makes the emulator accept `token` as `login`. */
    registerToken,
    /** Makes the emulator answer `401` to `token`. */
    revokeToken(token: string): void {
      tokenMap.delete(token)
    },
    /**
     * An installation token from emulate's own App flow: a JWT signed with the App's key, exchanged
     * at `POST /app/installations/{id}/access_tokens`. emulate refuses permissions the installation lacks.
     */
    async mintInstallationToken(options: { owner?: string, permissions?: Record<string, string>, repositories?: string[] } = {}): Promise<{ status: number, token?: string, expiresAt?: string, message?: string }> {
      const installation = installations[options.owner ?? owners[0]!]
      if (installation === undefined) return { status: 404, message: `The App isn't installed on "${options.owner}".` }
      const response = await app.request(`/app/installations/${installation}/access_tokens`, {
        method: 'POST',
        headers: { 'authorization': `Bearer ${appJwt()}`, 'content-type': 'application/json' },
        body: JSON.stringify({ permissions: options.permissions, repositories: options.repositories }),
      })
      const body = await response.json() as { token?: string, expires_at?: string, message?: string }
      return { status: response.status, token: body.token, expiresAt: body.expires_at, message: body.message }
    },
    /** Ends a workflow run and its jobs with a conclusion. emulate starts a run and never finishes one. */
    finishWorkflowRun(runId: number, conclusion: 'success' | 'failure' | 'cancelled'): void {
      const run = gh.workflowRuns.get(runId)
      if (!run) throw new Error(`GitHub emulator: no workflow run ${runId}.`)
      const now = new Date().toISOString()
      gh.workflowRuns.update(run.id, { status: 'completed', conclusion })
      for (const job of gh.jobs.findBy('run_id', run.id)) {
        gh.jobs.update(job.id, { status: 'completed', conclusion, completed_at: now, steps: job.steps.map(step => ({ ...step, status: 'completed', conclusion, completed_at: now })) })
      }
    },
    createDiscussion(fullName: string, author: string, input: { title: string, body?: string, category?: string }) {
      if (!parts) throw new Error('GitHub emulator: discussions need the supplement.')
      const repo = gh.repos.findOneBy('full_name', fullName)
      const user = gh.users.findOneBy('login', author)
      if (!repo || !user) throw new Error(`GitHub emulator: no repository "${fullName}" or no user "${author}".`)
      return parts.discussions.create(repo, user, input)
    },
    /** Back to the seeded state: the store, the webhooks, the tokens, and the logs. */
    async reset(): Promise<void> {
      store.reset()
      webhooks.clear()
      tokenMap.clear()
      tokenLogins.clear()
      requests.length = 0
      unknownDocuments.length = 0
      await seed()
    },
    close: () => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
      server.closeAllConnections()
    }),
  }
}
