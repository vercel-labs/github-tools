import type { AppEnv, Hono, Store, WebhookDispatcher } from '@emulators/core'
import type { GitHubStore } from '@emulators/github'
import { ApiError } from '../../emulators.js'
import type { Ctx } from '../access.js'

export interface SupplementContext {
  app: Hono<AppEnv>
  store: Store
  gh: GitHubStore
  webhooks: WebhookDispatcher
  baseUrl: string
}

/**
 * Calls one of emulate's own routes as the current caller, so its permission checks, its bot
 * user, and its webhook dispatch apply to what a supplement route builds on top of it. An error
 * status is rethrown as the caller's error.
 */
export async function callAsCaller<T = unknown>(app: Hono<AppEnv>, c: Ctx, method: string, path: string, body?: unknown): Promise<T> {
  const authorization = c.req.header('authorization')
  const response = await app.request(path, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      ...authorization ? { authorization } : {},
      ...body === undefined ? {} : { 'content-type': 'application/json' },
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  const parsed = text ? JSON.parse(text) : undefined
  if (response.status >= 400) throw new ApiError(response.status, parsed?.message ?? 'Request failed', parsed?.errors)
  return parsed as T
}
