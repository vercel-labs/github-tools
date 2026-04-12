import { defineHandler } from 'nitro/h3'
import { bot } from '../../lib/bot'

export default defineHandler(async (event) => {
  const handler = bot.webhooks.github
  if (!handler) {
    return new Response('GitHub adapter not configured', { status: 404 })
  }
  return handler(event.req, {
    waitUntil: (task: Promise<unknown>) => event.waitUntil(task),
  })
})
