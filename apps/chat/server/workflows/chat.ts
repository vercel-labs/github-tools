import { stepCountIs } from 'ai'
import type { ModelMessage } from 'ai'
import type { ModelCallStreamPart } from '@ai-sdk/workflow'
import { getWritable } from 'workflow'
import { createDurableGithubAgent } from '@github-tools/sdk/workflow'

export async function durableChatWorkflow(
  messages: ModelMessage[],
  token: string,
  model: string,
  additionalInstructions: string
) {
  'use workflow'

  const writable = getWritable<ModelCallStreamPart>()

  const agent = createDurableGithubAgent({
    model,
    token,
    requireApproval: true,
    // Read only inside the signing and verification steps, so the secret never enters the workflow log.
    experimental_toolApprovalSecret: { environmentVariable: 'TOOL_APPROVAL_SECRET' },
    additionalInstructions,
    stopWhen: stepCountIs(20),
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
