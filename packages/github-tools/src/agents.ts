import { ToolLoopAgent, tool } from 'ai'
import type { ModelMessage, ToolLoopAgentSettings, ToolSet } from 'ai'
import { z } from 'zod'
import { createGithubTools } from './index'
import type { AllGithubTools, GithubToolsBaseOptions } from './core/tool-types'
import { resolvePresetTools, type CombinedPresetToolNames, type GithubToolPreset, type PresetToolName } from './core/presets'
import { assertEvaluationAvailable, evaluatePresets, evaluateTools, evaluationRequest, fallbackPresets, fallbackTools } from './core/evaluation'
import { GITHUB_TOOL_CATALOG } from './core/catalog'
import { ALL_GITHUB_TOOL_NAMES, type GithubToolName } from './core/tool-names'
import { resolveInstructions } from './core/instructions'
export { resolveInstructions } from './core/instructions'

const MAX_CACHED_ROUTES = 100

/** Name of the tool `selection: 'tools'` adds so the model can list more GitHub tools. */
export const ENABLE_GITHUB_TOOLS = 'enableGithubTools'

const enableGithubToolsInput = z.object({
  names: z.array(z.enum(ALL_GITHUB_TOOL_NAMES as [GithubToolName, ...GithubToolName[]])).describe('GitHub tool names to list from the next step'),
})

const enableGithubToolsTool = tool({
  description: 'List more GitHub tools for this task. Your tool list shows the GitHub tools picked for the request; call this with the names of any others you need (every GitHub tool is in the `names` enum), and they are listed from your next step.',
  inputSchema: enableGithubToolsInput,
  execute: async ({ names }) => ({ enabled: names.map(name => ({ name, description: GITHUB_TOOL_CATALOG[name].description })) }),
})

// Tools the model asked for with `enableGithubTools`, in this call or an earlier one. The history
// keeps the model's raw input, so a call that fails the tool's schema enables nothing.
function enabledTools(messages: readonly ModelMessage[]): GithubToolName[] {
  return messages.flatMap(message => message.role === 'assistant' && Array.isArray(message.content)
    ? message.content.flatMap(part => part.type === 'tool-call' && part.toolName === ENABLE_GITHUB_TOOLS
      ? enableGithubToolsInput.safeParse(part.input).data?.names ?? []
      : [])
    : [])
}

type AgentOptions = Omit<ToolLoopAgentSettings<ToolSet>, 'model' | 'tools' | 'instructions'>

export type CreateGithubAgentOptions = AgentOptions & GithubToolsBaseOptions & {
  model: ToolLoopAgentSettings<ToolSet>['model']
  /**
   * Restrict tools and system prompt to a predefined preset.
   *
   * Selects a subset of tools and sets the preset's system prompt. Combine presets with an array
   * to merge their tool sets and system prompts.
   *
   * `'auto'` picks presets per call from the latest user message with an evaluation model
   * (Jev by default, see `evaluation`), then narrows `activeTools` and uses the matching
   * system prompt. Combines at most two presets (`evaluation.maxPresets`), and only uses
   * read-only `repo-explorer` when no other preset qualifies or none clears the threshold.
   * Never exposes the full catalog. Needs `ai` 7.0.105 or later, checked when the agent is created.
   *
   * @see {@link GithubToolPreset} for available presets and included tools.
   */
  preset?: GithubToolPreset | GithubToolPreset[] | 'auto'
  /**
   * Fully replace the default system prompt.
   * When set, `preset` system prompts and `additionalInstructions` are ignored.
   * `context` is still appended when provided.
   */
  instructions?: string
  /**
   * Append text to the preset-specific (or default) system prompt.
   * Ignored when `instructions` is set.
   */
  additionalInstructions?: string
}

function callMessages(call: { prompt?: unknown, messages?: unknown }): ModelMessage[] {
  if (typeof call.prompt === 'string') return [{ role: 'user', content: call.prompt }]
  return (call.prompt ?? call.messages ?? []) as ModelMessage[]
}

/**
 * Routing for a request, cached per request so an approval continuation keeps its tools.
 * Only successful decisions are kept, so a request routed while the evaluator was down is routed again.
 */
function cachedRouting<T>(route: (messages: readonly ModelMessage[]) => Promise<T>, fallback: (error: unknown) => T) {
  const routing = new Map<string, Promise<T>>()
  return async (messages: readonly ModelMessage[]): Promise<T> => {
    const key = JSON.stringify(evaluationRequest(messages))
    let routed = routing.get(key)
    if (!routed) {
      routed = route(messages)
      routing.set(key, routed)
      routed.catch(() => routing.delete(key))
      if (routing.size > MAX_CACHED_ROUTES) routing.delete(routing.keys().next().value!)
    }
    return routed.catch(fallback)
  }
}

export function createGithubAgent(options: CreateGithubAgentOptions & { preset?: undefined | 'auto' }): ToolLoopAgent<never, AllGithubTools>
export function createGithubAgent<P extends GithubToolPreset>(
  options: CreateGithubAgentOptions & { preset: P },
): ToolLoopAgent<never, Pick<AllGithubTools, PresetToolName<P>>>
export function createGithubAgent<P extends readonly GithubToolPreset[]>(
  options: CreateGithubAgentOptions & { preset: P },
): ToolLoopAgent<never, Pick<AllGithubTools, CombinedPresetToolNames<P>>>

/**
 * Create a pre-configured GitHub agent powered by the AI SDK's `ToolLoopAgent`.
 *
 * Returns a `ToolLoopAgent` instance with `.generate()` and `.stream()` methods.
 *
 * @example
 * ```ts
 * import { createGithubAgent } from '@github-tools/sdk'
 *
 * const agent = createGithubAgent({
 *   model: 'anthropic/claude-opus-5.5',
 *   token: process.env.GITHUB_TOKEN!,
 *   preset: 'code-review',
 *   context: { owner: 'vercel', repo: 'ai', pullNumber: 42 },
 * })
 *
 * const result = await agent.generate({ prompt: 'Review this PR' })
 * ```
 */
export function createGithubAgent({
  token,
  preset,
  requireApproval,
  evaluation,
  overrides,
  context,
  instructions,
  additionalInstructions,
  author,
  committer,
  coAuthors,
  ...agentOptions
}: CreateGithubAgentOptions): ToolLoopAgent<never, AllGithubTools | Pick<AllGithubTools, GithubToolName>> {
  const staticPreset = preset === 'auto' ? undefined : preset
  const tools = createGithubTools({ token, requireApproval, evaluation, preset: staticPreset, overrides, context, author, committer, coAuthors })
  const byTool = preset === 'auto' && evaluation?.selection === 'tools'
  // `activeTools` only names tools the agent has, so the tool set always holds every GitHub tool.
  const agentTools: ToolSet = byTool ? { ...tools, [ENABLE_GITHUB_TOOLS]: enableGithubToolsTool } : tools
  const settings = {
    ...agentOptions,
    tools: agentTools as typeof tools,
    instructions: resolveInstructions({ preset: staticPreset, instructions, additionalInstructions, context }),
  } as ToolLoopAgentSettings<never, typeof tools>

  if (byTool) {
    assertEvaluationAvailable()
    const prepareCall = agentOptions.prepareCall as typeof settings.prepareCall
    const prepareStep = agentOptions.prepareStep as typeof settings.prepareStep
    const picks = cachedRouting(messages => evaluateTools(messages, evaluation), (error: unknown) => fallbackTools(error, evaluation))
    const activeTools = async (messages: readonly ModelMessage[]) =>
      // `enableGithubTools` is in the tool set but not in its public type.
      [...new Set<string>([...await picks(messages), ...enabledTools(messages), ENABLE_GITHUB_TOOLS])] as (keyof typeof tools)[]
    settings.prepareCall = async (call) => {
      const next = { ...call, activeTools: await activeTools(callMessages(call)) }
      return prepareCall ? prepareCall(next) : next
    }
    settings.prepareStep = async (step) => {
      const own = { activeTools: await activeTools([...step.initialMessages, ...step.messages]) }
      return { ...own, ...await prepareStep?.(step) }
    }
  }
  else if (preset === 'auto') {
    assertEvaluationAvailable()
    const prepareCall = agentOptions.prepareCall as typeof settings.prepareCall
    const routes = cachedRouting(messages => evaluatePresets(messages, evaluation), (error: unknown) => fallbackPresets(error, evaluation))
    settings.prepareCall = async (call) => {
      const selected = await routes(callMessages(call))
      const next = {
        ...call,
        activeTools: [...resolvePresetTools(selected)],
        instructions: resolveInstructions({ preset: selected.length === 1 ? selected[0] : selected, instructions, additionalInstructions, context }),
      }
      return prepareCall ? prepareCall(next) : next
    }
  }

  return new ToolLoopAgent(settings) as ToolLoopAgent<never, typeof tools>
}
