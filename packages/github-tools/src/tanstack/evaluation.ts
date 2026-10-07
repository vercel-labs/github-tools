import { boolean, decide, score } from '@tanstack/ai'
import type { EvaluateAdapter, ModelMessage } from '@tanstack/ai'
import { GITHUB_TOOL_CATALOG } from '../core/catalog'
import { DEFAULT_EVALUATION_MODEL, INTENT_QUESTION, PRESET_PURPOSES, RISK_QUESTION, rankPresets, requiresApproval, type RoutablePreset } from '../core/evaluation-policy'
import { PRESET_TOOLS } from '../core/presets'
import { githubToolsErrors } from '../core/errors'
import type { GithubToolName } from '../core/tool-names'

/** Jev configuration for TanStack automatic approval and preset selection. */
export type GithubEvaluationOptions = {
  /** Defaults to vercelGatewayDecider('typesafe-ai/jev') using Gateway authentication. */
  adapter?: EvaluateAdapter
  /** Maximum risk on the 0–2 rubric. @default 1 */
  maxRisk?: number
  /** Minimum probability that the user requested the call. @default 0.6 */
  minIntent?: number
  /** Minimum probability for a preset to qualify. @default 0.7 */
  minPresetProbability?: number
  /** Maximum number of combined presets. @default 2 */
  maxPresets?: number
}

async function evaluationAdapter(options: GithubEvaluationOptions) {
  if (options.adapter) return options.adapter
  const { vercelGatewayDecider } = await import('@tanstack/ai-vercel-gateway')
  return vercelGatewayDecider(DEFAULT_EVALUATION_MODEL)
}

export function latestUserText(messages: readonly ModelMessage[]): string {
  const message = messages.findLast(message => message.role === 'user')
  if (!message) return ''
  if (typeof message.content === 'string') return message.content
  return message.content?.flatMap(part => part.type === 'text' ? [part.content] : []).join('\n') ?? ''
}

function evaluationFailed(error: unknown, options: GithubEvaluationOptions, fallback: string, signal?: AbortSignal) {
  signal?.throwIfAborted()
  if (error instanceof Error && error.name === 'AbortError') throw error
  const cause = error instanceof Error ? error : new Error(String(error))
  console.warn('[github-tools]', githubToolsErrors.EVALUATION_FAILED({
    model: options.adapter?.model ?? DEFAULT_EVALUATION_MODEL,
    fallback,
    detail: cause.message,
    cause,
  }))
}

export async function needsAutoApproval(name: GithubToolName, input: unknown, messages: readonly ModelMessage[], options: GithubEvaluationOptions = {}, signal?: AbortSignal): Promise<boolean> {
  signal?.throwIfAborted()
  try {
    const result = await decide({
      adapter: await evaluationAdapter(options),
      state: { request: latestUserText(messages), toolCall: { tool: name, description: GITHUB_TOOL_CATALOG[name].description, input } },
      questions: {
        risk: score({ instructions: RISK_QUESTION.instructions, levels: RISK_QUESTION.criteria }),
        intent: boolean(INTENT_QUESTION),
      },
      abortSignal: signal,
    })
    signal?.throwIfAborted()
    return requiresApproval(result.risk.score, result.intent.probability, options)
  } catch (error) {
    evaluationFailed(error, options, `asking approval for ${name}`, signal)
    return true
  }
}

export async function selectPresets(messages: readonly ModelMessage[], options: GithubEvaluationOptions = {}, signal?: AbortSignal): Promise<RoutablePreset[]> {
  signal?.throwIfAborted()
  try {
    const presets = Object.keys(PRESET_PURPOSES) as RoutablePreset[]
    const result = await decide({
      adapter: await evaluationAdapter(options),
      state: { request: latestUserText(messages) },
      questions: Object.fromEntries(presets.map(preset => [preset, boolean({
        instructions: 'Does handling this GitHub request need the tools of this preset?',
        criteria: { true: JSON.stringify({ purpose: PRESET_PURPOSES[preset], tools: [...PRESET_TOOLS[preset]] }) },
      })])),
      abortSignal: signal,
    })
    signal?.throwIfAborted()
    return rankPresets(Object.fromEntries(presets.map(preset => [preset, result[preset].probability])) as Record<RoutablePreset, number>, options)
  } catch (error) {
    evaluationFailed(error, options, 'using the repo-explorer preset', signal)
    return ['repo-explorer']
  }
}
