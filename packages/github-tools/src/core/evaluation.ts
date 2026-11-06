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
   * read-only `repo-explorer` is used.
   * @default 0.7
   */
  minPresetProbability?: number
  /**
   * Most presets `preset: 'auto'` combines in one call, keeping the most likely ones.
   * @default 2
   */
  maxPresets?: number
}

/**
 * Throws `EVALUATION_UNAVAILABLE` when the installed `ai` has no `experimental_evaluate`.
 * Call it where `'auto'` is configured, so a too-old `ai` fails at setup instead of mid-conversation.
 */
export function assertEvaluationAvailable() {
  loadEvaluate()
}

function loadEvaluate() {
  if (!('experimental_evaluate' in ai)) throw githubToolsErrors.EVALUATION_UNAVAILABLE()
  return ai.experimental_evaluate
}

function warnEvaluationFailed(model: Experimental_EvaluationModel, fallback: string, error: unknown, abortSignal?: AbortSignal) {
  abortSignal?.throwIfAborted()
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
 * fails, logs `EVALUATION_FAILED` and asks for approval. An aborted `abortSignal` rejects.
 *
 * The latest user message is trusted as the person's request: pass messages a person wrote,
 * not a prompt another model generated.
 */
export async function needsAutoApproval(
  toolName: GithubWriteToolName,
  input: unknown,
  messages: readonly ModelMessage[],
  { model = DEFAULT_EVALUATION_MODEL, maxRisk = 1, minIntent = 0.6 }: GithubEvaluationOptions = {},
  abortSignal?: AbortSignal,
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
    abortSignal,
  }).catch((error: unknown) => {
    warnEvaluationFailed(model, `asking approval for ${toolName}`, error, abortSignal)
    return undefined
  })
  if (!result) return true
  const { answers } = result
  return requiresApproval(answers.risk.score, answers.intent.probability, { maxRisk, minIntent })
}

/**
 * Presets the latest user message needs, from one evaluation call with an independent
 * yes/no question per preset. Returns up to `maxPresets` presets at or above
 * `minPresetProbability`, most likely first, and read-only `repo-explorer` when none qualifies.
 * `repo-explorer` is only combined with no other preset. Rejects when the evaluation call fails;
 * {@link selectPresets} falls back instead. Never returns `maintainer`, so the full catalog is never exposed.
 */
export async function evaluatePresets(
  messages: readonly ModelMessage[],
  { model = DEFAULT_EVALUATION_MODEL, minPresetProbability = 0.7, maxPresets = 2 }: GithubEvaluationOptions = {},
  abortSignal?: AbortSignal,
): Promise<RoutablePreset[]> {
  const evaluate = loadEvaluate()
  const presets = Object.keys(PRESET_PURPOSES) as RoutablePreset[]
  const { answers } = await evaluate({
    model,
    state: { request: latestUserText(messages) },
    questions: Object.fromEntries(presets.map(preset => [preset, {
      type: 'boolean' as const,
      instructions: 'Does handling this GitHub request need the tools of this preset?',
      criteria: { true: { purpose: PRESET_PURPOSES[preset], tools: [...PRESET_TOOLS[preset]] } },
    }])),
    abortSignal,
  })
  return rankPresets(Object.fromEntries(presets.map(preset => [preset, answers[preset].probability])) as Record<RoutablePreset, number>, { minPresetProbability, maxPresets })
}

/**
 * Logs `EVALUATION_FAILED` for a failed {@link evaluatePresets} call and returns the read-only
 * `repo-explorer` fallback. Rethrows when `abortSignal` is aborted.
 */
export function fallbackPresets(error: unknown, { model = DEFAULT_EVALUATION_MODEL }: GithubEvaluationOptions = {}, abortSignal?: AbortSignal): RoutablePreset[] {
  warnEvaluationFailed(model, 'using the repo-explorer preset', error, abortSignal)
  return ['repo-explorer']
}

/**
 * {@link evaluatePresets}, falling back to read-only `repo-explorer` (and logging
 * `EVALUATION_FAILED`) when the evaluation call fails.
 */
export async function selectPresets(
  messages: readonly ModelMessage[],
  options: GithubEvaluationOptions = {},
  abortSignal?: AbortSignal,
): Promise<RoutablePreset[]> {
  return evaluatePresets(messages, options, abortSignal).catch(error => fallbackPresets(error, options, abortSignal))
}

export function latestUserText(messages: readonly ModelMessage[]): string {
  const message = messages.findLast(m => m.role === 'user')
  if (!message) return ''
  if (typeof message.content === 'string') return message.content
  return message.content.flatMap(part => part.type === 'text' ? [part.text] : []).join('\n')
}
