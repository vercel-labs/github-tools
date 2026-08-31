import { z } from 'zod'
import { withOctokit } from '../client'
import { pageSchema, pagedList } from './pagination'

export const listNotificationsInputSchema = z.object({
  all: z.boolean().optional().default(false).describe('Include notifications already marked as read'),
  participating: z.boolean().optional().default(false).describe('Only notifications where the authenticated user is directly participating or mentioned'),
  perPage: z.number().optional().default(20).describe('Number of notifications to return (max 50)'),
  page: pageSchema,
})

export const listNotificationsDescription = 'List notification threads for the authenticated user. Unread only by default — set all true to include read threads. Requires a token with notifications access. When hasMore, pass nextPage — do not repeat the same call.'

export async function listNotificationsCore({ token, all, participating, perPage, page }: { token: string, all: boolean, participating: boolean, perPage: number, page: number }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.activity.listNotificationsForAuthenticatedUser({
    all,
    participating,
    per_page: perPage,
    page,
  })
  return pagedList(data.map(thread => ({
    threadId: thread.id,
    repository: thread.repository.full_name,
    subject: {
      title: thread.subject.title,
      type: thread.subject.type,
      url: thread.subject.url,
    },
    reason: thread.reason,
    unread: thread.unread,
    updatedAt: thread.updated_at,
  })), perPage, page, data.length >= perPage)
  })
}

export const markNotificationReadInputSchema = z.object({
  threadId: z.string().describe('Notification thread ID (from listNotifications)'),
})

export const markNotificationReadDescription = 'Mark a single notification thread as read'

/** Idempotent — marking an already-read thread is a no-op on GitHub. */
export async function markNotificationReadCore({ token, threadId }: { token: string, threadId: string }) {
  return withOctokit(token, async (octokit) => {
  await octokit.rest.activity.markThreadAsRead({ thread_id: Number(threadId) })
  return { marked: true, threadId }
  })
}
