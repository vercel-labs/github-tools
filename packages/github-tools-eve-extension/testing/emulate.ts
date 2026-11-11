import { setEnvironmentData, type Worker } from 'node:worker_threads'
import type { EveEvalSession, EveEvalTurn } from 'eve/evals'
import { GithubClient, type EvalTarget } from './client.js'
import { startConnectEmulator, type ConnectEmulator, type ConnectRequest } from './connect/emulator.js'
import { CONNECT_URL_ENV, GITHUB_URL_ENV, PROBE_KEY } from './env.js'
import { startGithubEmulator, type GithubEmulator, type PersonSeed, type RepositorySeed } from './github/emulator.js'

export interface EmulateGithubOptions {
  /** Repositories by full name, such as `acme/web`. An owner named in `people` is that user, and any other is an organization. */
  repositories: Record<string, RepositorySeed>
  /**
   * The people evals act as. Each is a GitHub user with a role on every repository, and the
   * GitHub account of the eve principal with the same name: `as('alice')` sends a message as her.
   */
  people?: Record<string, PersonSeed>
}

/** What an eval reads from Vercel Connect, as `t.context.connect`. */
export class ConnectClient {
  constructor(private readonly connect: ConnectEmulator) {}

  /** Every request the Connect emulator answered, in order, with the subject and the scopes each token asked for. */
  get requests(): readonly ConnectRequest[] {
    return this.connect.requests
  }

  /**
   * Invalidates the token Vercel Connect holds for a person, at GitHub. Their next call gets
   * `401`, eve drops the token it cached, and asks them to sign in.
   */
  revoke(person: string): void {
    this.connect.revoke(person)
  }

  /**
   * Finishes the sign-in a turn asked for, the way a browser does after the person consents on
   * GitHub, and returns the turn that resumes.
   */
  async completeSignIn(t: { readonly target: { fetch(path: string): Promise<Response> } }, turn: Pick<EveEvalTurn, 'interactions'> & { readonly session: Pick<EveEvalSession, 'nextTurn'> }): Promise<EveEvalTurn> {
    const url = turn.interactions.find(interaction => interaction.request.kind === 'sign-in')?.request.signIn?.url
    if (!url) throw new Error('The turn asked for no sign-in.')
    const { pathname, search } = new URL(url)
    const callback = await t.target.fetch(`${pathname}${search}`)
    if (!callback.ok) throw new Error(`The sign-in callback answered ${callback.status}.`)
    return turn.session.nextTurn()
  }
}

/** The running emulators, returned by `emulateGithub` from an eval's `setup`. */
export interface GithubEmulation {
  readonly github: GithubClient
  readonly connect: ConnectClient
  /** Stops both emulators. Call it from `teardown`. */
  close(): Promise<void>
}

const PROBE_SLOTS = 64

/**
 * Starts a GitHub emulator and a Vercel Connect emulator, and points the agent at them. Call it
 * from `setup` in `evals/evals.config.ts`: everything the agent needs is in `process.env` when it
 * returns, which is before eve starts the agent. If the agent's thread then starts without the
 * redirect to the emulators, the run fails before the first eval.
 *
 * ```ts
 * export default defineEvalConfig({
 *   setup: () => emulateGithub({
 *     repositories: { 'acme/web': { labels: ['bug'] } },
 *     people: { alice: { role: 'write' }, bob: { role: 'read' } },
 *   }),
 *   teardown: context => context?.close(),
 * })
 * ```
 */
export async function emulateGithub({ repositories, people = {} }: EmulateGithubOptions): Promise<GithubEmulation> {
  const github = await startGithubEmulator({ repositories, people })
  const connect = await startConnectEmulator(github, people)
  const installation = await github.mintInstallationToken()
  // The redirect writes the ID of each thread it loads in to this buffer, which every worker of this process shares.
  const probe = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * PROBE_SLOTS))
  setEnvironmentData(PROBE_KEY, probe.buffer)

  // eve runs the agent in a worker thread of this process. A worker's first message comes after
  // Node ran the preload there, and the agent's is its address, which eve waits for before the first eval.
  const probeWorker = (worker: Worker) => {
    worker.once('message', () => {
      if (probe.subarray(1, 1 + Atomics.load(probe, 0)).includes(worker.threadId)) return
      throw new Error([
        `GitHub is emulated for this eval run, and thread ${worker.threadId} started without the redirect to the emulators.`,
        'The agent would send the emulators\' tokens to api.github.com and api.vercel.com, so the run stops here.',
        '`emulateGithub` names the redirect in NODE_OPTIONS, and eve gives the agent\'s thread that environment.',
        'Check that nothing clears NODE_OPTIONS after `setup`, and that this version of eve still starts the agent in a worker thread of the `eve eval` process.',
      ].join(' '))
    })
  }
  process.on('worker', probeWorker)

  // Resolved through the package's name: eve can bundle this file into a cache directory, away from its neighbors.
  const redirect = new URL('./redirect.js', import.meta.resolve('@github-tools/eve-extension/testing')).href

  const environment: Record<string, string> = {
    [GITHUB_URL_ENV]: github.url,
    [CONNECT_URL_ENV]: connect.url,
    // eve gives the agent's thread this environment, and Node loads the redirect there before any agent file.
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${redirect}`.trim(),
    // `@vercel/connect` refuses to send a request without an unexpired OIDC token.
    VERCEL_OIDC_TOKEN: `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 86_400 })).toString('base64url')}.emulator`,
    // A mount with a static token would send the real one to the emulator.
    GITHUB_TOKEN: installation.token!,
    // What eve's GitHub channel reads when it has no `credentials`.
    GITHUB_APP_ID: String(github.githubApp.id),
    GITHUB_APP_PRIVATE_KEY: github.githubApp.privateKey,
    GITHUB_APP_SLUG: github.githubApp.slug,
    GITHUB_WEBHOOK_SECRET: github.githubApp.webhookSecret,
  }
  const previous = Object.fromEntries(Object.keys(environment).map(name => [name, process.env[name]]))
  Object.assign(process.env, environment)

  return {
    github: new GithubClient(github, Object.keys(repositories)),
    connect: new ConnectClient(connect),
    async close() {
      for (const [name, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[name]
        else process.env[name] = value
      }
      process.off('worker', probeWorker)
      setEnvironmentData(PROBE_KEY, undefined)
      await Promise.all([github.close(), connect.close()])
    },
  }
}

/** Request options that send a message, or answer an approval, as a seeded person. */
export const as = (person: string) => ({ headers: { 'x-eval-user': person } })

export type { EvalTarget, GithubEmulator }
