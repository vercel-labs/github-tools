import { WorkflowAgent } from '@ai-sdk/workflow'
import type {
  WorkflowAgentOptions,
  WorkflowAgentStreamOptions,
  WorkflowAgentStreamResult,
  TelemetryOptions,
} from '@ai-sdk/workflow'
import type {
  LanguageModel,
  ToolSet,
  StepResult,
  FinishReason,
  LanguageModelUsage,
  LanguageModelResponseMetadata,
  ModelMessage,
  StopCondition,
} from 'ai'
import { createGithubTools } from './index'
import { resolveInstructions } from './agents'
import type { GithubToolPreset, ApprovalConfig } from './index'
import type { CommitIdentity } from './types'
import type { Context } from '@ai-sdk/provider-utils'

/**
 * Result of {@link DurableGithubAgent.generate}.
 */
export interface DurableGithubAgentGenerateResult<TTools extends ToolSet = ToolSet> {
  text: string
  finishReason: FinishReason
  usage: LanguageModelUsage
  steps: StepResult<TTools>[]
  response: LanguageModelResponseMetadata & { messages: ModelMessage[] }
}

/**
 * A wrapper around {@link WorkflowAgent} that adds a non-streaming
 * `.generate()` method alongside the existing `.stream()`.
 *
 * - `.stream()` — delegates to `WorkflowAgent.stream()`. Each tool call is
 *   an individually retriable workflow step. Supports `needsApproval` on tools.
 * - `.generate()` — uses `generateText` from the AI SDK for non-streaming
 *   execution. Must be called from within a `"use step"` function in
 *   workflow context (the Workflow runtime blocks raw I/O in workflow scope).
 */
export class DurableGithubAgent<TTools extends ToolSet = ToolSet> {
  private agent: WorkflowAgent<TTools>
  private _model: LanguageModel
  private _instructions?: string
  private _telemetry?: TelemetryOptions
  private _tools: TTools

  constructor(options: WorkflowAgentOptions<TTools>) {
    this.agent = new WorkflowAgent(options)
    this._model = options.model
    this._instructions = typeof options.instructions === 'string' ? options.instructions : undefined
    this._telemetry = options.telemetry
    this._tools = options.tools ?? {} as TTools
  }

  /** The tool set configured for this agent. */
  get tools(): TTools {
    return this.agent.tools
  }

  /**
   * Stream the agent's response. Delegates directly to `WorkflowAgent.stream()`.
   * Works in workflow context — each tool call is a durable step.
   */
  stream<TStreamTools extends TTools = TTools, OUTPUT = never, PARTIAL_OUTPUT = never>(
    options: WorkflowAgentStreamOptions<TStreamTools, Context, OUTPUT, PARTIAL_OUTPUT>,
  ): Promise<WorkflowAgentStreamResult<TStreamTools, OUTPUT>> {
    return this.agent.stream(options)
  }

  /**
   * Generate a non-streaming response using `generateText` from the AI SDK.
   *
   * In workflow context this **must** be called from within a `"use step"`
   * function, because the Workflow runtime blocks direct I/O (HTTP calls)
   * at the workflow scope level.
   */
  async generate({ prompt, stopWhen }: { prompt: string, stopWhen?: StopCondition<TTools> | Array<StopCondition<TTools>> }): Promise<DurableGithubAgentGenerateResult<TTools>> {
    const { generateText } = await import('ai')

    const system = this._instructions

    const result = await generateText({
      model: this._model,
      tools: this._tools,
      system,
      prompt,
      stopWhen,
      experimental_telemetry: this._telemetry as Parameters<typeof generateText>[0]['experimental_telemetry'],
    })

    return {
      text: result.text,
      finishReason: result.finishReason,
      usage: result.usage,
      steps: result.steps as StepResult<TTools>[],
      response: result.response,
    }
  }
}

/**
 * Options for creating a durable GitHub agent via {@link createDurableGithubAgent}.
 *
 * Extends all `WorkflowAgentOptions` (temperature, telemetry, callbacks, etc.)
 * and adds GitHub-specific fields (token, preset, approval config).
 */
export type CreateDurableGithubAgentOptions =
  Omit<WorkflowAgentOptions, 'model' | 'tools' | 'instructions'> & {
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
    /**
     * Default author for commit-creating tools.
     * Falls back to the authenticated user when omitted.
     */
    author?: CommitIdentity
    /**
     * Default committer for commit-creating tools.
     * Falls back to the authenticated user when omitted.
     */
    committer?: CommitIdentity
    /**
     * Co-authors to attribute on all commits.
     * Added as "Co-authored-by" trailers to commit messages.
     */
    coAuthors?: CommitIdentity[]
  }

/**
 * Create a pre-configured durable GitHub agent powered by `WorkflowAgent`
 * from `@ai-sdk/workflow`.
 *
 * Returns a {@link DurableGithubAgent} with two interaction modes:
 *
 * - `.stream()` — works directly in workflow scope; each tool call is a durable step.
 *   Write tools honor `requireApproval` via `needsApproval` and pause the workflow
 *   until the user approves or denies.
 * - `.generate()` — uses `generateText` from the AI SDK; must be called from
 *   within a `"use step"` function when running inside a workflow.
 *
 * @example Streaming (chat UI — works in workflow scope)
 * ```ts
 * import { createDurableGithubAgent } from '@github-tools/sdk/workflow'
 * import { getWritable } from 'workflow'
 * import type { ModelMessage, ModelCallStreamPart } from 'ai'
 *
 * async function chatWorkflow(messages: ModelMessage[], token: string) {
 *   "use workflow"
 *   const agent = createDurableGithubAgent({
 *     model: 'anthropic/claude-sonnet-4.6',
 *     token,
 *     preset: 'code-review',
 *   })
 *   const writable = getWritable<ModelCallStreamPart>()
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
  author,
  committer,
  coAuthors,
  ...agentOptions
}: CreateDurableGithubAgentOptions): DurableGithubAgent {
  const tools = createGithubTools({ token, requireApproval, preset, author, committer, coAuthors })

  return new DurableGithubAgent({
    ...agentOptions,
    model,
    tools,
    instructions: resolveInstructions({ preset, instructions, additionalInstructions }),
  })
}

export { createGithubTools, createGithubAgent } from './index'
export type { CommitIdentity, CommitToolOptions, GithubTools, GithubToolsOptions, GithubToolPreset, GithubWriteToolName, ApprovalConfig, ToolOverrides } from './index'
export type { CreateGithubAgentOptions } from './agents'
