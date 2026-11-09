import { ToolLoopAgent, asSchema, tool } from 'ai'
import type { ModelMessage, ToolLoopAgentSettings, ToolSet } from 'ai'
import { z } from 'zod'
import { createGithubTools } from './index'
import type { AllGithubTools, GithubToolsBaseOptions } from './core/tool-types'
import { resolvePresetTools, type CombinedPresetToolNames, type GithubToolPreset, type PresetToolName } from './core/presets'
import { DEFAULT_EVALUATION_MODEL } from './core/evaluation-policy'
import { assertEvaluationAvailable, evaluatePresets, evaluateTools, evaluationRequest, fallbackPresets, fallbackTools, type GithubEvaluationOptions } from './core/evaluation'
import { githubToolsErrors } from './core/errors'
import { ALL_GITHUB_TOOL_NAMES, type GithubToolName } from './core/tool-names'
import { resolveInstructions } from './core/instructions'
export { resolveInstructions } from './core/instructions'

const MAX_CACHED_ROUTES = 100

/** Name of the tool `preset: 'auto'` adds so the model can call GitHub tools that were not picked. */
export const CALL_GITHUB_TOOL = 'callGithubTool'

const callGithubToolInput = z.object({
  name: z.enum(ALL_GITHUB_TOOL_NAMES as [GithubToolName, ...GithubToolName[]]).describe('GitHub tool to call'),
  input: z.record(z.string(), z.unknown()).optional().describe('The tool\'s arguments. Omit to get its description and input schema without calling it.'),
})

// One fixed tool reaches every GitHub tool that was not picked, so the tool list, which starts
// the provider's cached prompt, never changes during the conversation.
function callGithubTool(tools: AllGithubTools) {
  const validate = async (name: GithubToolName, input: unknown) => {
    const result = await asSchema(tools[name].inputSchema).validate?.(input)
    return result ?? { success: true as const, value: input }
  }
  return tool({
    description: 'Call a GitHub tool that is not in your tool list. Every GitHub tool is in the `name` enum. Pass its arguments as `input`; if you do not know them, omit `input` to get the tool\'s description and input schema first.',
    inputSchema: callGithubToolInput,
    needsApproval: async ({ name, input }, options) => {
      if (input === undefined) return false
      const parsed = await validate(name, input)
      const needsApproval = tools[name].needsApproval
      if (!parsed.success || needsApproval === undefined) return false
      return typeof needsApproval === 'function' ? needsApproval(parsed.value, options) : needsApproval
    },
    execute: async ({ name, input }, options) => {
      if (input === undefined) return { name, description: tools[name].description, inputSchema: await asSchema(tools[name].inputSchema).jsonSchema }
      const parsed = await validate(name, input)
      if (!parsed.success) throw new Error(`Invalid input for ${name}: ${parsed.error.message}\nInput schema: ${JSON.stringify(await asSchema(tools[name].inputSchema).jsonSchema)}`)
      return tools[name].execute!(parsed.value, options)
    },
    toModelOutput: async ({ toolCallId, input: { name, input }, output }) => {
      const toModelOutput = tools[name].toModelOutput
      if (input === undefined || !toModelOutput) return { type: 'json', value: output }
      // `execute` ran with the validated input, so the named tool sees its defaults here too.
      const parsed = await validate(name, input)
      return toModelOutput({ toolCallId, input: parsed.success ? parsed.value : input, output })
    },
  })
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
   * `'auto'` asks an evaluation model (Jev by default, see `evaluation`) which tools the
   * conversation's first request needs, and narrows `activeTools` to those and the core read
   * tools for the whole conversation. A `callGithubTool` tool lets the model call any other
   * GitHub tool without changing the tool list, so the provider's prompt cache holds. With `evaluation.selection: 'presets'`, it routes each request to at most two
   * presets instead and uses their system prompts. Needs `ai` 7.0.105 or later, checked when the
   * agent is created.
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

// With `scope: 'session'`, routing sees only the conversation up to its first request.
function firstRequest(messages: readonly ModelMessage[]): readonly ModelMessage[] {
  const index = messages.findIndex(message => message.role === 'user')
  return index === -1 ? messages : messages.slice(0, index + 1)
}

function callMessages(call: { prompt?: unknown, messages?: unknown }): ModelMessage[] {
  if (typeof call.prompt === 'string') return [{ role: 'user', content: call.prompt }]
  return (call.prompt ?? call.messages ?? []) as ModelMessage[]
}

function decisionModelId({ model = DEFAULT_EVALUATION_MODEL }: GithubEvaluationOptions = {}): string {
  return typeof model === 'string' ? model : `${model.provider}/${model.modelId}`
}

// `settings` holds what the decision depends on besides the request, so agents with different
// thresholds or decision models sharing a store don't reuse each other's decisions.
async function storeKey(kind: string, settings: unknown, key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([settings, key])))
  return `github-tools:${kind}:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Routing for a request, cached per request so an approval continuation keeps its tools, and in
 * `evaluation.store` when set. Only successful decisions are kept, so a request routed while the
 * evaluator was down is routed again.
 */
function cachedRouting<T extends readonly string[]>(
  kind: string,
  settings: unknown,
  route: (messages: readonly ModelMessage[]) => Promise<T>,
  fallback: (error: unknown) => T,
  store: GithubEvaluationOptions['store'],
) {
  const routing = new Map<string, Promise<T>>()
  return async (messages: readonly ModelMessage[]): Promise<T> => {
    const key = JSON.stringify(evaluationRequest(messages))
    let routed = routing.get(key)
    if (!routed) {
      routed = store
        ? storeKey(kind, settings, key).then(async (stored) => {
            const saved = await store.get(stored)
            if (saved) return saved as T
            const decided = await route(messages)
            await store.set(stored, decided)
            return decided
          })
        : route(messages)
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
  const byTool = preset === 'auto' && evaluation?.selection !== 'presets'
  // `activeTools` only names tools the agent has, so the tool set always holds every GitHub tool.
  const agentTools: ToolSet = byTool ? { ...tools, [CALL_GITHUB_TOOL]: callGithubTool(tools as AllGithubTools) } : tools
  const settings = {
    ...agentOptions,
    tools: agentTools as typeof tools,
    instructions: resolveInstructions({ preset: staticPreset, instructions, additionalInstructions, context }),
  } as ToolLoopAgentSettings<never, typeof tools>

  if (preset === 'auto' && evaluation?.scope === 'session' && !byTool) throw githubToolsErrors.SESSION_SCOPE_NEEDS_TOOL_SELECTION()

  if (byTool) {
    assertEvaluationAvailable()
    const prepareCall = agentOptions.prepareCall as typeof settings.prepareCall
    const picks = cachedRouting('tools', [decisionModelId(evaluation), evaluation?.minToolProbability, evaluation?.maxTools], messages => evaluateTools(messages, evaluation), (error: unknown) => fallbackTools(error, evaluation), evaluation?.store)
    settings.prepareCall = async (call) => {
      const messages = callMessages(call)
      const picked = await picks(evaluation?.scope === 'turn' ? messages : firstRequest(messages))
      // `callGithubTool` is in the tool set but not in its public type.
      const next = { ...call, activeTools: [...picked, CALL_GITHUB_TOOL] as (keyof typeof tools)[] }
      return prepareCall ? prepareCall(next) : next
    }
  }
  else if (preset === 'auto') {
    assertEvaluationAvailable()
    const prepareCall = agentOptions.prepareCall as typeof settings.prepareCall
    const routes = cachedRouting('presets', [decisionModelId(evaluation), evaluation?.minPresetProbability, evaluation?.maxPresets], messages => evaluatePresets(messages, evaluation), (error: unknown) => fallbackPresets(error, evaluation), evaluation?.store)
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
