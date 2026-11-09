import { WorkflowAgent } from '@ai-sdk/workflow'
import type {
  WorkflowAgentOptions,
  WorkflowAgentStreamOptions,
  WorkflowAgentStreamResult,
} from '@ai-sdk/workflow'
import type { LanguageModel, Output, ToolSet } from 'ai'
import { createGithubTools } from './index'
import { resolveInstructions } from './agents'
import { githubToolsErrors } from './core/errors'
import type { AllGithubTools } from './core/tool-types'
import type { CombinedPresetToolNames, GithubToolPreset, PresetToolName } from './core/presets'
import type { GithubToolName } from './core/tool-names'
import type { GithubToolsBaseOptions } from './core/tool-types'
import type { StaticApprovalConfig } from './index'
import type { CommitIdentity } from './types'
import type { GithubTokenInput } from './core/token'
import type { GithubToolsContext } from './core/context'
import type { Context } from '@ai-sdk/provider-utils'

// Read from `WorkflowAgent` instead of importing `WorkflowAgentGenerateOptions` and
// `WorkflowAgentGenerateResult`, which `@ai-sdk/workflow` only exports from 2.0.59: importing them
// would break type checking for `.stream()` users on older supported versions.
type WorkflowGenerate<TTools extends ToolSet> = WorkflowAgent<TTools> extends { generate: infer Generate } ? Generate : never

/** Options of {@link DurableGithubAgent.generate}: those of `WorkflowAgent.generate()`. */
export type DurableGithubAgentGenerateOptions<TTools extends ToolSet = ToolSet> = WorkflowGenerate<TTools> extends (options: infer Options) => unknown ? Options : never

/**
 * Result of {@link DurableGithubAgent.generate}: the `WorkflowAgent` generation result. Read the
 * fields you need inside the workflow and return those, since the result itself is not serializable.
 */
export type DurableGithubAgentGenerateResult<TTools extends ToolSet = ToolSet> = WorkflowGenerate<TTools> extends (options: never) => Promise<infer Result> ? Result : never

/**
 * A GitHub agent built on {@link WorkflowAgent}. Call both methods from a `"use workflow"`
 * function: each model call and each tool call runs as its own retriable workflow step, and
 * tools with `needsApproval` pause the run until the user answers.
 *
 * - `.stream()` writes the response to a `writable` for chat UIs.
 * - `.generate()` returns the finished result, for bots, webhooks, and background jobs.
 */
export class DurableGithubAgent<TTools extends ToolSet = ToolSet> {
  private agent: WorkflowAgent<TTools>

  constructor(options: WorkflowAgentOptions<TTools>) {
    this.agent = new WorkflowAgent(options)
  }

  /** The tool set configured for this agent. */
  get tools(): TTools {
    return this.agent.tools
  }

  /** Stream the agent's response. Delegates to `WorkflowAgent.stream()`. */
  stream<TStreamTools extends TTools = TTools, OUTPUT = never, PARTIAL_OUTPUT = never>(
    options: WorkflowAgentStreamOptions<TStreamTools, Context, OUTPUT, PARTIAL_OUTPUT>,
  ): Promise<WorkflowAgentStreamResult<TStreamTools, OUTPUT>> {
    return this.agent.stream(options)
  }

  /**
   * Generate the full response without streaming. Delegates to `WorkflowAgent.generate()`, which
   * needs `@ai-sdk/workflow` 2.0.59 or later. Stops after 20 steps unless `stopWhen` says otherwise.
   * A write that needs approval ends the call with a `tool-approval-request` in
   * `responseMessages`; append the user's `tool-approval-response` and call `generate()` again.
   */
  generate<OUTPUT = string>(
    options: DurableGithubAgentGenerateOptions<TTools> & { output?: Output.Output<OUTPUT> },
  ): Promise<Omit<DurableGithubAgentGenerateResult<TTools>, 'output'> & { readonly output: OUTPUT }> {
    if (typeof this.agent.generate !== 'function') throw githubToolsErrors.DURABLE_GENERATE_UNAVAILABLE()
    return this.agent.generate(options)
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
     * GitHub personal access token or async token provider.
     * Falls back to `process.env.GITHUB_TOKEN` when omitted.
     */
    token?: GithubTokenInput
    /**
     * Restrict tools and system prompt to a predefined preset.
     *
     * Selects a subset of tools and sets the preset's system prompt. Combine presets with an array
     * to merge their tool sets and system prompts.
     *
     * @see {@link GithubToolPreset} for available presets and included tools.
     */
    preset?: GithubToolPreset | GithubToolPreset[]
    /**
     * Control whether write operations require user approval before execution.
     *
     * `'auto'` is not supported: the evaluation call cannot run inside a workflow function.
     *
     * @see {@link StaticApprovalConfig} for global and per-tool options.
     */
    requireApproval?: StaticApprovalConfig
    /**
     * Per-tool overrides (`description`, `title`, `needsApproval`, …), as on `createGithubTools`.
     * `execute`, `inputSchema`, and `outputSchema` cannot be overridden.
     */
    overrides?: GithubToolsBaseOptions['overrides']
    /**
     * Repositories and branches the tools may act on, checked before each call reaches GitHub,
     * as on `createGithubTools`.
     */
    guardrails?: GithubToolsBaseOptions['guardrails']
    /** Send no write to GitHub, as on `createGithubTools`. */
    dryRun?: boolean
    /**
     * Fully replace the default system prompt.
     * When set, `preset` system prompts and `additionalInstructions` are ignored.
     */
    instructions?: string
    /**
     * Append text to the preset-specific (or default) system prompt.
     * Ignored when `instructions` is set.
     */
    additionalInstructions?: string
    /**
     * Default owner / repo / PR / issue / ref values for tools and the system prompt.
     */
    context?: GithubToolsContext
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
 *     model: 'anthropic/claude-opus-5.5',
 *     token,
 *     preset: 'code-review',
 *   })
 *   const writable = getWritable<ModelCallStreamPart>()
 *   await agent.stream({ messages, writable })
 * }
 * ```
 */
export function createDurableGithubAgent(
  options: CreateDurableGithubAgentOptions & { preset?: undefined },
): DurableGithubAgent<AllGithubTools>
export function createDurableGithubAgent<P extends GithubToolPreset>(
  options: CreateDurableGithubAgentOptions & { preset: P },
): DurableGithubAgent<Pick<AllGithubTools, PresetToolName<P>>>
export function createDurableGithubAgent<P extends readonly GithubToolPreset[]>(
  options: CreateDurableGithubAgentOptions & { preset: P },
): DurableGithubAgent<Pick<AllGithubTools, CombinedPresetToolNames<P>>>
export function createDurableGithubAgent({
  model,
  token,
  preset,
  requireApproval,
  overrides,
  context,
  instructions,
  additionalInstructions,
  author,
  committer,
  coAuthors,
  guardrails,
  dryRun,
  ...agentOptions
}: CreateDurableGithubAgentOptions): DurableGithubAgent<AllGithubTools | Pick<AllGithubTools, GithubToolName>> {
  const tools = createGithubTools({ token, requireApproval, preset, overrides, context, author, committer, coAuthors, guardrails, dryRun })

  return new DurableGithubAgent({
    ...agentOptions,
    model,
    tools,
    instructions: resolveInstructions({ preset, instructions, additionalInstructions, context }),
  }) as DurableGithubAgent<typeof tools>
}

export { createGithubTools, createGithubAgent } from './index'
export type { CommitIdentity, CommitToolOptions, GithubTools, GithubToolsOptions, GithubToolPreset, GithubToolName, GithubWriteToolName, ApprovalConfig, ToolOverrides, AllGithubTools, PresetToolName, CombinedPresetToolNames, GithubToolsForPreset, PickGithubTools, GithubTokenInput, GithubToolsContext } from './index'
export { PRESET_TOOLS, GITHUB_TOOL_NAMES, GITHUB_WRITE_TOOLS, resolveGithubToken } from './index'
export type { CreateGithubAgentOptions } from './agents'
