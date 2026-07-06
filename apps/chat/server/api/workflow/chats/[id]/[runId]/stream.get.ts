import { createModelCallToUIChunkTransform } from '@ai-sdk/workflow'
import { getRun } from 'workflow/api'
import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'Reconnect to a durable workflow chat stream.',
    tags: ['ai', 'workflow']
  }
})

export default defineEventHandler(async (event) => {
  const { runId } = await getValidatedRouterParams(event, z.object({
    runId: z.string()
  }).parse)

  const startIndex = Number(getQuery(event).startIndex ?? '0')

  const run = getRun(runId)
  const readable = run
    .getReadable({ startIndex })
    .pipeThrough(createModelCallToUIChunkTransform())

  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'x-workflow-run-id': runId
  })

  return readable
})
