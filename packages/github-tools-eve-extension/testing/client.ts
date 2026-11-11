import { createOctokit, type Octokit } from '@github-tools/sdk'
import type { GithubEmulator, GithubRequest } from './github/emulator.js'

export interface EmulatedIssue {
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  author: string
  labels: string[]
  assignees: string[]
}

export interface EmulatedPullRequest extends EmulatedIssue {
  draft: boolean
  merged: boolean
  /** The head branch. */
  head: string
  headSha: string
  /** The base branch. */
  base: string
}

export interface EmulatedComment {
  id: number
  body: string
  author: string
}

export interface WaitForCommentOptions {
  /** Who wrote it: a person, or `'app'` for the agent's GitHub App. */
  by: string
  /** Only a comment created after this comment ID. */
  after?: number
  /** How long to wait. Defaults to 30 seconds. */
  timeoutMs?: number
}

/** The part of eve's eval context that names the agent under test. */
export interface EvalTarget {
  readonly target: { readonly url: string }
}

type RestItem = { number: number, title: string, body: string | null, state: 'open' | 'closed', user: { login: string }, labels: Array<{ name: string }>, assignees: Array<{ login: string }> }
type RestComment = { id: number, body: string, user: { login: string } }

const issueOf = (item: RestItem): EmulatedIssue => ({
  number: item.number,
  title: item.title,
  body: item.body,
  state: item.state,
  author: item.user.login,
  labels: item.labels.map(label => label.name),
  assignees: item.assignees.map(assignee => assignee.login),
})

const commentOf = (comment: RestComment): EmulatedComment => ({ id: comment.id, body: comment.body, author: comment.user.login })

/**
 * An issue or a pull request in the emulator. Awaiting it reads its current state, so
 * `await web.issue(7)` is the issue and `web.issue(7).waitForComment(...)` waits on it.
 */
export class ThreadHandle<T extends EmulatedIssue> implements PromiseLike<T> {
  constructor(
    private readonly github: GithubEmulator,
    private readonly repository: string,
    private readonly actor: string,
    readonly number: number,
    private readonly read: () => Promise<T>,
  ) {}

  then<A = T, B = never>(onfulfilled?: ((value: T) => A | PromiseLike<A>) | null, onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null): Promise<A | B> {
    return this.read().then(onfulfilled, onrejected)
  }

  /** The comments in its conversation, oldest first. Review comments on a diff aren't included. */
  async comments(): Promise<EmulatedComment[]> {
    const comments = await this.github.request<RestComment[]>(this.actor, 'GET', `/repos/${this.repository}/issues/${this.number}/comments?per_page=100`)
    return comments.map(commentOf)
  }

  /**
   * Waits for a comment in its conversation. A turn that a webhook starts runs after the webhook
   * is answered, so an eval waits on the agent's reply and doesn't read it right away.
   */
  async waitForComment({ by, after = 0, timeoutMs = 30_000 }: WaitForCommentOptions): Promise<EmulatedComment> {
    const author = by === 'app' ? `${this.github.githubApp.slug}[bot]` : by
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const comment = (await this.comments()).find(candidate => candidate.author === author && candidate.id > after)
      if (comment) return comment
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    const deliveries = this.github.webhooks.getDeliveries().slice(-5).map(delivery => `${delivery.event}.${delivery.action} -> ${delivery.status_code ?? 'no answer'}`)
    const requests = this.github.requests.slice(-10).map(request => `${request.method} ${request.path} as ${request.actor} -> ${request.status}`)
    throw new Error([
      `No comment by ${author} on ${this.repository}#${this.number} after ${timeoutMs} ms.`,
      `Last webhook deliveries: ${deliveries.join(', ') || 'none. Call github.deliverWebhooksTo(t) before creating the comment.'}`,
      `Last requests to the emulator: ${requests.join(', ') || 'none'}`,
    ].join('\n'))
  }
}

/** One repository in the emulator, read and changed as one person. */
export class RepositoryClient {
  constructor(
    private readonly github: GithubEmulator,
    /** The full name, such as `acme/web`. */
    readonly name: string,
    private readonly actor: string,
  ) {}

  private request<T>(method: string, path: string, body?: unknown): Promise<T> {
    return this.github.request<T>(this.actor, method, `/repos/${this.name}${path}`, body)
  }

  /** The same repository, acting as a seeded person. Without it, calls act as the repository's admin. */
  as(person: string): RepositoryClient {
    this.github.tokenFor(person)
    return new RepositoryClient(this.github, this.name, person)
  }

  async createIssue(input: { title: string, body?: string, labels?: string[], assignees?: string[] }): Promise<EmulatedIssue> {
    return issueOf(await this.request<RestItem>('POST', '/issues', input))
  }

  /**
   * Opens a pull request from a new branch with one commit that writes the given files, by path.
   * They default to one new file. The person needs Write, since the branch is in this repository.
   */
  async createPullRequest(input: { title: string, body?: string, files?: Record<string, string>, base?: string, draft?: boolean }): Promise<EmulatedPullRequest> {
    const base = input.base ?? (await this.request<{ default_branch: string }>('GET', '')).default_branch
    const { object } = await this.request<{ object: { sha: string } }>('GET', `/git/ref/heads/${base}`)
    const { tree: baseTree } = await this.request<{ tree: { sha: string } }>('GET', `/git/commits/${object.sha}`)
    const branch = `eval-${this.github.nextId()}`
    // One commit through the Git database routes, which take a file whether or not the base branch has it.
    const files = input.files ?? { [`${branch}.txt`]: `${input.title}\n` }
    const tree = await this.request<{ sha: string }>('POST', '/git/trees', {
      base_tree: baseTree.sha,
      tree: Object.entries(files).map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })),
    })
    const commit = await this.request<{ sha: string }>('POST', '/git/commits', { message: input.title, tree: tree.sha, parents: [object.sha] })
    await this.request('POST', '/git/refs', { ref: `refs/heads/${branch}`, sha: commit.sha })
    const created = await this.request<{ number: number }>('POST', '/pulls', { title: input.title, body: input.body, head: branch, base, draft: input.draft })
    return this.pull(created.number)
  }

  /** Comments in the conversation of an issue or a pull request. */
  async comment(number: number, body: string): Promise<EmulatedComment> {
    return commentOf(await this.request<RestComment>('POST', `/issues/${number}/comments`, { body }))
  }

  /** Opens a discussion. GitHub has no REST route for it, so the emulator creates it directly. */
  createDiscussion(input: { title: string, body?: string, category?: string }): { number: number } {
    return { number: this.github.createDiscussion(this.name, this.actor, input).number }
  }

  issue(number: number): ThreadHandle<EmulatedIssue> {
    return new ThreadHandle(this.github, this.name, this.actor, number, async () => issueOf(await this.request<RestItem>('GET', `/issues/${number}`)))
  }

  pull(number: number): ThreadHandle<EmulatedPullRequest> {
    return new ThreadHandle(this.github, this.name, this.actor, number, async () => {
      const pull = await this.request<RestItem & { draft: boolean, merged: boolean, head: { ref: string, sha: string }, base: { ref: string } }>('GET', `/pulls/${number}`)
      return { ...issueOf(pull), draft: pull.draft, merged: pull.merged, head: pull.head.ref, headSha: pull.head.sha, base: pull.base.ref }
    })
  }
}

/**
 * What an eval arranges and asserts on, as `t.context.github`. It calls the emulator in process
 * through its REST routes, so `requests` holds only what arrived over HTTP: the agent's calls,
 * and those of an Octokit from `octokit()`.
 */
export class GithubClient {
  private readonly hooks = new Map<string, Promise<unknown>>()
  private readonly repositories: Set<string>
  private webhookUrl: string | undefined

  constructor(private readonly github: GithubEmulator, repositories: string[]) {
    this.repositories = new Set(repositories)
  }

  /** The emulator's URL. URLs in what it returns, such as `html_url`, name this host and not github.com. */
  get url(): string {
    return this.github.url
  }

  /** The agent's GitHub App. Its bot comments as `<slug>[bot]`, and a comment reaches the agent by mentioning `@<slug>`. */
  get app(): { slug: string } {
    return { slug: this.github.githubApp.slug }
  }

  /** Every request the emulator answered over HTTP, in order. */
  get requests(): readonly GithubRequest[] {
    return this.github.requests
  }

  /** Every webhook the emulator delivered, with the status the agent answered. */
  get deliveries() {
    return this.github.webhooks.getDeliveries()
  }

  repo(name: string): RepositoryClient {
    if (!this.repositories.has(name)) throw new Error(`No repository "${name}" in the emulator. Seeded repositories: ${[...this.repositories].join(', ')}.`)
    return new RepositoryClient(this.github, name, this.github.adminOf(name))
  }

  /**
   * Creates a repository with a unique name under a seeded owner, with every person's role. Evals
   * share one emulator, so one that changes repository-level state, such as labels, works on its own.
   */
  async createRepo(owner: string): Promise<RepositoryClient> {
    if (!this.github.owners.includes(owner)) throw new Error(`No owner "${owner}" in the emulator. Seeded owners: ${this.github.owners.join(', ')}.`)
    const admin = this.github.adminOf(owner)
    const { full_name: name } = await this.github.request<{ full_name: string }>(admin, 'POST', admin === owner ? '/user/repos' : `/orgs/${owner}/repos`, { name: `repo-${this.github.nextId()}`, auto_init: true })
    await this.github.applyRoles(name)
    this.repositories.add(name)
    if (this.webhookUrl) await this.hook(name)
    return this.repo(name)
  }

  /** An Octokit bound to the emulator, as a seeded person or as the first repository's admin, for anything this client has no method for. */
  octokit(person?: string): Octokit {
    const octokit = createOctokit(this.github.tokenFor(person ?? this.github.admin))
    octokit.hook.before('request', (options: { baseUrl: string }) => {
      options.baseUrl = this.github.url
    })
    return octokit
  }

  /**
   * Registers the agent's GitHub channel as a webhook of every repository, signed with the secret
   * the agent was given. From then on, a comment an eval creates reaches the agent. Calling it
   * again changes nothing, so every eval that needs it can call it.
   */
  async deliverWebhooksTo(t: EvalTarget): Promise<void> {
    const url = `${t.target.url.replace(/\/$/u, '')}/eve/v1/github`
    if (this.webhookUrl && this.webhookUrl !== url) throw new Error(`Webhooks already go to ${this.webhookUrl}.`)
    this.webhookUrl = url
    await Promise.all([...this.repositories].map(name => this.hook(name)))
  }

  // One hook per repository: evals run concurrently, and a second one would deliver every comment twice.
  private hook(name: string): Promise<unknown> {
    let registration = this.hooks.get(name)
    if (!registration) {
      registration = this.github.request(this.github.adminOf(name), 'POST', `/repos/${name}/hooks`, {
        config: { url: this.webhookUrl, content_type: 'json', secret: this.github.githubApp.webhookSecret },
        events: ['*'],
      })
      this.hooks.set(name, registration)
    }
    return registration
  }
}
