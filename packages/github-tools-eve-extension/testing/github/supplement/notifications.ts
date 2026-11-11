import type { Entity } from '@emulators/core'
import type { GitHubRepo } from '@emulators/github'
import { ApiError } from '../../emulators.js'
import { paginate, requireUser, type Ctx } from '../access.js'
import type { SupplementContext } from './context.js'

interface NotificationThread extends Entity {
  user_id: number
  repo_id: number
  /** The issue or pull request the thread is about. A person has one thread for each. */
  subject_number: number
  subject: { title: string, type: 'Issue' | 'PullRequest', url: string }
  reason: 'mention' | 'assign' | 'review_requested'
  unread: boolean
  last_read_at: string | null
}

export interface NotifyingPayload {
  action?: string
  sender?: { login?: string }
  issue?: { number: number, title: string, body?: string | null, pull_request?: unknown }
  pull_request?: { number: number, title: string, body?: string | null }
  comment?: { body?: string }
  assignee?: { login?: string }
  requested_reviewer?: { login?: string }
}

const MENTION = /(?:^|[^\w/-])@([a-z\d](?:[a-z\d-]{0,38}))(?![\w-])/giu

/**
 * Notifications belong to a user, so both routes need a personal token. A thread appears for a
 * person who is mentioned, assigned, or asked for a review, which are the events emulate dispatches.
 */
export function registerNotifications({ app, store, gh, baseUrl }: SupplementContext) {
  const threads = store.collection<NotificationThread>('supplement.notifications', ['user_id'])

  const format = (thread: NotificationThread) => {
    const repo = gh.repos.get(thread.repo_id)
    return {
      id: String(thread.id),
      unread: thread.unread,
      reason: thread.reason,
      updated_at: thread.updated_at,
      last_read_at: thread.last_read_at,
      subject: { ...thread.subject, latest_comment_url: null },
      repository: { id: thread.repo_id, name: repo?.name, full_name: repo?.full_name, private: repo?.private },
      url: `${baseUrl}/notifications/threads/${thread.id}`,
      subscription_url: `${baseUrl}/notifications/threads/${thread.id}/subscription`,
    }
  }

  app.get('/notifications', (c: Ctx) => {
    const user = requireUser(c, gh)
    // Every reason the emulator records is a direct one, so `participating` narrows nothing.
    const matching = threads.findBy('user_id', user.id)
      .filter(thread => c.req.query('all') === 'true' || thread.unread)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    return c.json(paginate(c, matching).map(format))
  })

  app.patch('/notifications/threads/:thread_id', (c: Ctx) => {
    const user = requireUser(c, gh)
    const thread = threads.get(Number(c.req.param('thread_id')))
    if (!thread || thread.user_id !== user.id) throw new ApiError(404, 'Not Found')
    threads.update(thread.id, { unread: false, last_read_at: new Date().toISOString() })
    return c.body(null, 205)
  })

  return function notify(event: string, payload: NotifyingPayload, repo: GitHubRepo): void {
    const subject = payload.pull_request ?? payload.issue
    if (!subject) return
    const type = payload.pull_request || payload.issue?.pull_request ? 'PullRequest' : 'Issue'
    const add = (login: string | undefined, reason: NotificationThread['reason']) => {
      const user = login === undefined ? undefined : gh.users.findOneBy('login', login)
      if (!user || user.type !== 'User' || user.login === payload.sender?.login) return
      const existing = threads.findBy('user_id', user.id).find(thread => thread.repo_id === repo.id && thread.subject_number === subject.number)
      if (existing) {
        threads.update(existing.id, { unread: true, reason })
        return
      }
      threads.insert({
        user_id: user.id,
        repo_id: repo.id,
        subject_number: subject.number,
        subject: { title: subject.title, type, url: `${baseUrl}/repos/${repo.full_name}/${type === 'Issue' ? 'issues' : 'pulls'}/${subject.number}` },
        reason,
        unread: true,
        last_read_at: null,
      })
    }
    if (payload.action === 'assigned') add(payload.assignee?.login, 'assign')
    if (payload.action === 'review_requested') add(payload.requested_reviewer?.login, 'review_requested')
    const text = payload.action === 'created' ? payload.comment?.body : payload.action === 'opened' ? subject.body : undefined
    if (!text || !['issues', 'pull_request', 'issue_comment', 'pull_request_review_comment'].includes(event)) return
    for (const [, login] of text.matchAll(MENTION)) add(login, 'mention')
  }
}
