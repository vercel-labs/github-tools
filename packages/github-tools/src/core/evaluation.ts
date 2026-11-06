import * as ai from 'ai'
import type { Experimental_EvaluationModel, JSONValue, ModelMessage } from 'ai'
import { GITHUB_TOOL_CATALOG } from './catalog'
import { githubToolsErrors } from './errors'
import { PRESET_TOOLS } from './presets'
import { DEFAULT_EVALUATION_MODEL, RISK_QUESTION, INTENT_QUESTION, PRESET_PURPOSES, conversationState, rankPresets, requiresApproval, type RoutablePreset } from './evaluation-policy'
export { DEFAULT_EVALUATION_MODEL, AUTO_APPROVAL_TOOLS } from './evaluation-policy'
import type { GithubWriteToolName } from './write-tools'

/**
 * Tuning for `requireApproval: 'auto'` and `preset: 'auto'`. Every field is optional.
 */
export type GithubEvaluationOptions = {
  /**
   * Decision model for AI SDK `experimental_decide`: an AI Gateway ID or a model instance.
   * @default 'typesafe-ai/jev'
   */
  model?: Experimental_EvaluationModel
  /**
   * Provider options passed to every decision call, for example AI Gateway settings such as
   * `{ gateway: { zeroDataRetention: true } }`.
   */
  providerOptions?: Record<string, Record<string, JSONValue>>
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
 * Throws `EVALUATION_UNAVAILABLE` when the installed `ai` has neither `experimental_decide`
 * nor `experimental_evaluate`. Call it where `'auto'` is configured, so a too-old `ai` fails
 * at setup instead of mid-conversation.
 */
export function assertEvaluationAvailable() {
  loadDecide()
}

// `experimental_decide` replaced `experimental_evaluate` in ai 7.0.128; the old name stays an alias.
function loadDecide(): typeof ai.experimental_decide {
  const exports: Partial<Pick<typeof ai, 'experimental_decide' | 'experimental_evaluate'>> = ai
  const decide = exports.experimental_decide ?? exports.experimental_evaluate
  if (!decide) throw githubToolsErrors.EVALUATION_UNAVAILABLE()
  return decide
}

// `decide` throws when the model refuses any question; the error names the refused questions.
function refusedQuestions(error: unknown): readonly string[] | undefined {
  const exports: Partial<Pick<typeof ai, 'Experimental_DecisionRefusalError'>> = ai
  return exports.Experimental_DecisionRefusalError?.isInstance(error) ? error.questionIds : undefined
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
  { model = DEFAULT_EVALUATION_MODEL, maxRisk = 1, minIntent = 0.6, providerOptions }: GithubEvaluationOptions = {},
  abortSignal?: AbortSignal,
): Promise<boolean> {
  const decide = loadDecide()
  const result = await decide({
    model,
    providerOptions,
    state: {
      ...conversationState(messages, messageText),
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
    // A refusal is an answer, not an outage: it gives no evidence the call is safe, so a person decides.
    if (!refusedQuestions(error)) warnEvaluationFailed(model, `asking approval for ${toolName}`, error, abortSignal)
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
  { model = DEFAULT_EVALUATION_MODEL, minPresetProbability = 0.7, maxPresets = 2, providerOptions }: GithubEvaluationOptions = {},
  abortSignal?: AbortSignal,
): Promise<RoutablePreset[]> {
  const decide = loadDecide()
  const state = conversationState(messages, messageText)
  const ask = (presets: readonly RoutablePreset[]) => decide({
    model,
    providerOptions,
    state,
    questions: Object.fromEntries(presets.map(preset => [preset, {
      type: 'boolean' as const,
      instructions: 'Does handling this GitHub request need the tools of this preset?',
      criteria: { true: { purpose: PRESET_PURPOSES[preset], tools: [...PRESET_TOOLS[preset]] } },
    }])),
    abortSignal,
  })
  const presets = Object.keys(PRESET_PURPOSES) as RoutablePreset[]
  const probabilities = Object.fromEntries(presets.map(preset => [preset, 0])) as Record<RoutablePreset, number>
  // A refused preset question counts as a no: ask once more without it instead of losing every answer.
  const { answers } = await ask(presets).catch((error: unknown) => {
    const refused = refusedQuestions(error)
    const remaining = presets.filter(preset => !refused?.includes(preset))
    if (!refused || remaining.length === 0) throw error
    return ask(remaining)
  })
  for (const [preset, answer] of Object.entries(answers)) probabilities[preset as RoutablePreset] = answer.probability
  return rankPresets(probabilities, { minPresetProbability, maxPresets })
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
  return conversationState(messages, messageText).request
}

/** The `request` and `repliedTo` the evaluation model sees for these messages. */
export function evaluationRequest(messages: readonly ModelMessage[]) {
  return conversationState(messages, messageText)
}

function messageText(message: ModelMessage): string {
  if (typeof message.content === 'string') return message.content
  return message.content.flatMap(part => part.type === 'text' ? [part.text] : []).join('\n')
}
