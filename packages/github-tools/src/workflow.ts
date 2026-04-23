import { DurableAgent } from '@workflow/ai/agent'
import type { CompatibleLanguageModel, DurableAgentOptions, DurableAgentStreamOptions, DurableAgentStreamResult, TelemetrySettings } from '@workflow/ai/agent'
import type { ToolSet, StepResult, FinishReason, LanguageModelUsage, LanguageModelResponseMetadata, ModelMessage, StopCondition } from 'ai'
import { createGithubTools } from './index'
import { resolveInstructions } from './agents'
import type { GithubToolPreset, ApprovalConfig } from './index'
import type { CommitIdentity } from './types'

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
 * A wrapper around the Workflow SDK's `DurableAgent` that adds a non-streaming
 * `.generate()` method alongside the existing `.stream()`.
 *
 * - `.stream()` — delegates to `DurableAgent.stream()`, each tool call is
 *   an individually retriable workflow step. Works in workflow context.
 * - `.generate()` — uses `generateText` from the AI SDK for non-streaming
 *   execution. Must be called from within a `"use step"` function in
 *   workflow context (the Workflow runtime blocks raw I/O in workflow scope).
 */
export class DurableGithubAgent<TTools extends ToolSet = ToolSet> {
  private agent: DurableAgent<TTools>
  private _model: DurableAgentOptions<TTools>['model']
  private _instructions?: DurableAgentOptions<TTools>['instructions']
  private _telemetry?: TelemetrySettings
  private _tools: TTools

  constructor(options: DurableAgentOptions<TTools>) {
    this.agent = new DurableAgent(options)
    this._model = options.model
    this._instructions = options.instructions
    this._telemetry = options.experimental_telemetry
    this._tools = options.tools ?? {} as TTools
  }

  /** The tool set configured for this agent. */
  get tools(): TTools {
    return this.agent.tools
  }

  /**
   * Stream the agent's response. Delegates directly to `DurableAgent.stream()`.
   * Works in workflow context — each tool call is a durable step.
   */
  stream<TStreamTools extends TTools = TTools, OUTPUT = never, PARTIAL_OUTPUT = never>(
    options: DurableAgentStreamOptions<TStreamTools, OUTPUT, PARTIAL_OUTPUT>,
  ): Promise<DurableAgentStreamResult<TStreamTools, OUTPUT>> {
    return this.agent.stream(options)
  }

  /**
   * Generate a non-streaming response using `generateText` from the AI SDK.
   *
   * In workflow context this **must** be called from within a `"use step"`
   * function, because the Workflow runtime blocks direct I/O (HTTP calls)
   * at the workflow scope level.
   *
   * @example
   * ```ts
   * async function agentTurn(prompt: string) {
   *   "use step"
   *   const agent = createDurableGithubAgent({
   *     model: 'anthropic/claude-sonnet-4.6',
   *     preset: 'code-review',
   *   })
   *   const { text } = await agent.generate({ prompt })
   *   return text
   * }
   * ```
   */
  async generate({ prompt, stopWhen }: { prompt: string, stopWhen?: StopCondition<TTools> | Array<StopCondition<TTools>> }): Promise<DurableGithubAgentGenerateResult<TTools>> {
    const { generateText } = await import('ai')

    const model = typeof this._model === 'function'
      ? await this._model()
      : this._model

    const system = typeof this._instructions === 'string'
      ? this._instructions
      : undefined

    const result = await generateText({
      model: model as Parameters<typeof generateText>[0]['model'],
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
 * Extends all `DurableAgentOptions` (temperature, telemetry, callbacks, etc.)
 * and adds GitHub-specific fields (token, preset, approval config).
 */
export type CreateDurableGithubAgentOptions =
  Omit<DurableAgentOptions, 'model' | 'tools' | 'instructions'> & {
    model: string | CompatibleLanguageModel | (() => Promise<CompatibleLanguageModel>)
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
 * Create a pre-configured durable GitHub agent powered by Vercel Workflow SDK's `DurableAgent`.
 *
 * Returns a {@link DurableGithubAgent} with two interaction modes:
 *
 * - `.stream()` — works directly in workflow scope; each tool call is a durable step.
 * - `.generate()` — uses `generateText` from the AI SDK; must be called from
 *   within a `"use step"` function when running inside a workflow.
 *
 * **Note:** `requireApproval` is accepted for forward-compatibility but is currently
 * ignored by `DurableAgent` — the Workflow SDK does not yet support interactive tool
 * approval. All tools execute immediately without user confirmation.
 *
 * @example Streaming (chat UI — works in workflow scope)
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
 *
 * @example Non-streaming (bot / background job — needs "use step")
 * ```ts
 * import { createDurableGithubAgent } from '@github-tools/sdk/workflow'
 *
 * async function agentTurn(prompt: string) {
 *   "use step"
 *   const agent = createDurableGithubAgent({
 *     model: 'anthropic/claude-sonnet-4.6',
 *     preset: 'code-review',
 *   })
 *   const { text } = await agent.generate({ prompt })
 *   return text
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
}: CreateDurableGithubAgentOptions) {
  const tools = createGithubTools({ token, requireApproval, preset, author, committer, coAuthors })

  const resolvedModel = typeof model === 'string' || typeof model === 'function'
    ? model
    : () => Promise.resolve(model)

  return new DurableGithubAgent({
    ...agentOptions as Omit<typeof agentOptions, 'toolChoice'>,
    model: resolvedModel,
    tools,
    instructions: resolveInstructions({ preset, instructions, additionalInstructions }),
  })
}

export { createGithubTools, createGithubAgent } from './index'
export type { CommitIdentity, CommitToolOptions, GithubTools, GithubToolsOptions, GithubToolPreset, GithubWriteToolName, ApprovalConfig, ToolOverrides } from './index'
export type { CreateGithubAgentOptions } from './agents'
