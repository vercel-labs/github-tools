import { DurableAgent } from '@workflow/ai/agent'
import type { LanguageModel } from 'ai'
import { createGithubTools } from './index'
import { resolveInstructions } from './agents'
import type { GithubToolPreset, ApprovalConfig } from './index'

export type CreateDurableGithubAgentOptions = {
  model: string | LanguageModel
  /**
   * GitHub personal access token.
   * Falls back to `process.env.GITHUB_TOKEN` when omitted.
   */
  token?: string
  preset?: GithubToolPreset | GithubToolPreset[]
  requireApproval?: ApprovalConfig
  instructions?: string
  additionalInstructions?: string
  /** Maximum number of LLM calls before stopping. Unlimited by default. */
  maxSteps?: number
  temperature?: number
}

/**
 * Create a pre-configured durable GitHub agent powered by Vercel Workflow SDK's `DurableAgent`.
 *
 * Each tool call runs as a durable step with automatic retries and observability.
 * Must be used inside a `"use workflow"` function.
 *
 * @example
 * ```ts
 * import { createDurableGithubAgent } from '@github-tools/sdk/workflow'
 * import { getWritable } from 'workflow'
 * import type { ModelMessage, UIMessageChunk } from 'ai'
 *
 * async function chatWorkflow(messages: ModelMessage[], token: string) {
 *   "use workflow"
 *   const agent = createDurableGithubAgent({
 *     model: 'anthropic/claude-sonnet-4.6',
 *     token,
 *     preset: 'code-review',
 *   })
 *   const writable = getWritable<UIMessageChunk>()
 *   await agent.stream({ messages, writable })
 * }
 * ```
 */
export function createDurableGithubAgent({
  model,
  token,
  preset,
  requireApproval,
  instructions,
  additionalInstructions,
  ...agentOptions
}: CreateDurableGithubAgentOptions) {
  const tools = createGithubTools({ token, requireApproval, preset })

  return new DurableAgent({
    ...agentOptions,
    model,
    tools,
    instructions: resolveInstructions({ preset, instructions, additionalInstructions }),
  })
}

export { createGithubTools, createGithubAgent } from './index'
export type { GithubTools, GithubToolsOptions, GithubToolPreset, GithubWriteToolName, ApprovalConfig } from './index'
export type { CreateGithubAgentOptions } from './agents'
