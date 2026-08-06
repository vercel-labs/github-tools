import { z } from 'zod'
import { createOctokit } from '../client'

export const listNotificationsInputSchema = z.object({
  all: z.boolean().optional().default(false).describe('Include notifications already marked as read'),
  participating: z.boolean().optional().default(false).describe('Only notifications where the authenticated user is directly participating or mentioned'),
  perPage: z.number().optional().default(20).describe('Number of notifications to return (max 50)'),
  page: z.number().optional().default(1).describe('Page number for pagination'),
})

export const listNotificationsDescription = 'List notification threads for the authenticated user. Unread only by default — set all true to include read threads. Requires a token with notifications access'

export async function listNotificationsCore({ token, all, participating, perPage, page }: { token: string, all: boolean, participating: boolean, perPage: number, page: number }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.activity.listNotificationsForAuthenticatedUser({
    all,
    participating,
    per_page: perPage,
    page,
  })
  return data.map(thread => ({
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
  }))
}

export const markNotificationReadInputSchema = z.object({
  threadId: z.string().describe('Notification thread ID (from listNotifications)'),
})

export const markNotificationReadDescription = 'Mark a single notification thread as read'

/** Idempotent — marking an already-read thread is a no-op on GitHub. */
export async function markNotificationReadCore({ token, threadId }: { token: string, threadId: string }) {
  const octokit = createOctokit(token)
  await octokit.rest.activity.markThreadAsRead({ thread_id: Number(threadId) })
  return { marked: true, threadId }
}
