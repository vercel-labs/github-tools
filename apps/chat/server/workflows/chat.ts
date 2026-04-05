import { getWritable } from 'workflow'
import { createDurableGithubAgent } from '@github-tools/sdk/workflow'
import type { ModelMessage, UIMessageChunk } from 'ai'

export async function durableChatWorkflow(
  messages: ModelMessage[],
  token: string,
  model: string,
  additionalInstructions: string,
  maxSteps: number
) {
  'use workflow'

  const writable = getWritable<UIMessageChunk>()

  const agent = createDurableGithubAgent({
    model,
    token,
    additionalInstructions,
    maxSteps
  })

  await agent.stream({
    messages,
    writable
  })
}
