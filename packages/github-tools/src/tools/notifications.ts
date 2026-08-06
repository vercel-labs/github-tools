import { tool } from 'ai'
import {
  listNotificationsInputSchema,
  listNotificationsDescription,
  listNotificationsCore,
  markNotificationReadInputSchema,
  markNotificationReadDescription,
  markNotificationReadCore,
} from '../core/notifications'
import { resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { ToolOptions, GithubTool } from '../types'

async function listNotificationsStep(args: Parameters<typeof listNotificationsCore>[0]) {
  "use step"
  return listNotificationsCore(args)
}

/** List notification threads for the authenticated user. */
export const listNotifications = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listNotificationsDescription,
    inputSchema: listNotificationsInputSchema,
    execute: async args => listNotificationsStep({ token: await resolveGithubToken(token), ...args }),
  })

async function markNotificationReadStep(args: Parameters<typeof markNotificationReadCore>[0]) {
  "use step"
  return markNotificationReadCore(args)
}

/** Mark a notification thread as read. Requires approval by default. */
export const markNotificationRead = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: markNotificationReadDescription,
    needsApproval,
    inputSchema: markNotificationReadInputSchema,
    execute: async args => markNotificationReadStep({ token: await resolveGithubToken(token), ...args }),
  })
