import * as ai from 'ai'
import type { Experimental_EvaluationModel, JSONValue, ModelMessage } from 'ai'
import { GITHUB_TOOL_CATALOG } from './catalog'
import { githubToolsErrors } from './errors'
import { PRESET_TOOLS } from './presets'
import { DEFAULT_EVALUATION_MODEL, RISK_QUESTION, INTENT_QUESTION, PRESET_PURPOSES, rankPresets, requiresApproval, type RoutablePreset } from './evaluation-policy'
export { DEFAULT_EVALUATION_MODEL, AUTO_APPROVAL_TOOLS } from './evaluation-policy'
import type { GithubWriteToolName } from './write-tools'

/**
 * Tuning for `requireApproval: 'auto'` and `preset: 'auto'`. Every field is optional.
 */
export type GithubEvaluationOptions = {
  /**
   * Evaluation model for AI SDK `experimental_evaluate`: an AI Gateway ID or a model instance.
   * @default 'typesafe-ai/jev'
   */
  model?: Experimental_EvaluationModel
  /**
   * Highest risk an `'auto'` tool call can have and still run without approval, on a 0–2 scale
   * (0 negligible, 1 visible but reversible, 2 hard to undo).
   * @default 1
   */
  maxRisk?: number
  /**
   * Lowest probability that the latest user message asked for the call, for it to run without approval.
   * @default 0.6
   */
  minIntent?: number
  /**
   * Lowest probability for `preset: 'auto'` to select a preset. When no preset reaches it,
   * the single most likely preset is used.
   * @default 0.7
   */
  minPresetProbability?: number
  /**
   * Most presets `preset: 'auto'` combines in one call, keeping the most likely ones.
   * @default 2
   */
  maxPresets?: number
}

function loadEvaluate() {
  if (!('experimental_evaluate' in ai)) throw githubToolsErrors.EVALUATION_UNAVAILABLE()
  return ai.experimental_evaluate
}

function warnEvaluationFailed(model: Experimental_EvaluationModel, fallback: string, error: unknown) {
  const cause = error instanceof Error ? error : new Error(String(error))
  console.warn('[github-tools]', githubToolsErrors.EVALUATION_FAILED({
    model: typeof model === 'string' ? model : model.modelId,
    fallback,
    detail: cause.message,
    cause,
  }))
}

/**
 * Whether an `'auto'` write tool call needs human approval: `false` only when the model
 * rates it low-risk and asked for by the latest user message. When the evaluation call
 * fails, logs `EVALUATION_FAILED` and asks for approval.
 */
export async function needsAutoApproval(
  toolName: GithubWriteToolName,
  input: unknown,
  messages: readonly ModelMessage[],
  { model = DEFAULT_EVALUATION_MODEL, maxRisk = 1, minIntent = 0.6 }: GithubEvaluationOptions = {},
): Promise<boolean> {
  const evaluate = loadEvaluate()
  const result = await evaluate({
    model,
    state: {
      request: latestUserText(messages),
      toolCall: {
        tool: toolName,
        description: GITHUB_TOOL_CATALOG[toolName].description,
        input: input as JSONValue,
      },
    },
    questions: {
      risk: { type: 'score', ...RISK_QUESTION },
      intent: { type: 'boolean', ...INTENT_QUESTION },
    },
  }).catch((error: unknown) => {
    warnEvaluationFailed(model, `asking approval for ${toolName}`, error)
    return undefined
  })
  if (!result) return true
  const { answers } = result
  return requiresApproval(answers.risk.score, answers.intent.probability, { maxRisk, minIntent })
}

/**
 * Presets the latest user message needs, from one evaluation call with an independent
 * yes/no question per preset. Returns up to `maxPresets` presets at or above
 * `minPresetProbability`, most likely first; when none qualifies, the single most likely preset.
 * `repo-explorer` is only returned when no other preset qualifies.
 * When the evaluation call fails, logs `EVALUATION_FAILED` and returns read-only `repo-explorer`.
 * Never returns `maintainer`, so the full catalog is never exposed.
 */
export async function selectPresets(
  messages: readonly ModelMessage[],
  { model = DEFAULT_EVALUATION_MODEL, minPresetProbability = 0.7, maxPresets = 2 }: GithubEvaluationOptions = {},
): Promise<RoutablePreset[]> {
  const evaluate = loadEvaluate()
  const presets = Object.keys(PRESET_PURPOSES) as RoutablePreset[]
  const result = await evaluate({
    model,
    state: { request: latestUserText(messages) },
    questions: Object.fromEntries(presets.map(preset => [preset, {
      type: 'boolean' as const,
      instructions: 'Does handling this GitHub request need the tools of this preset?',
      criteria: { true: { purpose: PRESET_PURPOSES[preset], tools: [...PRESET_TOOLS[preset]] } },
    }])),
  }).catch((error: unknown) => {
    warnEvaluationFailed(model, 'using the repo-explorer preset', error)
    return undefined
  })
  if (!result) return ['repo-explorer']
  const { answers } = result
  return rankPresets(Object.fromEntries(presets.map(preset => [preset, answers[preset].probability])) as Record<RoutablePreset, number>, { minPresetProbability, maxPresets })
}

export function latestUserText(messages: readonly ModelMessage[]): string {
  const message = messages.findLast(m => m.role === 'user')
  if (!message) return ''
  if (typeof message.content === 'string') return message.content
  return message.content.flatMap(part => part.type === 'text' ? [part.text] : []).join('\n')
}
