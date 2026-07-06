import { stepCountIs } from 'ai'
import type { ModelMessage } from 'ai'
import type { ModelCallStreamPart } from '@ai-sdk/workflow'
import { getWritable } from 'workflow'
import { createDurableGithubAgent } from '@github-tools/sdk/workflow'

export async function durableChatWorkflow(
  messages: ModelMessage[],
  token: string,
  model: string,
  additionalInstructions: string,
  maxSteps: number
) {
  'use workflow'

  const writable = getWritable<ModelCallStreamPart>()

  const agent = createDurableGithubAgent({
    model,
    token,
    requireApproval: true,
    additionalInstructions,
    stopWhen: stepCountIs(maxSteps),
    providerOptions: {
      openai: { reasoningEffort: 'low', reasoningSummary: 'detailed' },
      google: { thinkingConfig: { includeThoughts: true, thinkingBudget: 2048 } }
    }
  })

  await agent.stream({
    messages,
    writable
  })
}
