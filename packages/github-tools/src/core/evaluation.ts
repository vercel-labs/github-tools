import * as ai from 'ai'
import type { Experimental_EvaluationModel, JSONValue, ModelMessage } from 'ai'
import { GITHUB_TOOL_CATALOG } from './catalog'
import { githubToolsErrors } from './errors'
import { CORE_READ_TOOLS, PRESET_TOOLS } from './presets'
import { ALL_GITHUB_TOOL_NAMES, type GithubToolName } from './tool-names'
import { DEFAULT_EVALUATION_MODEL, RISK_QUESTION, INTENT_QUESTION, PRESET_PURPOSES, conversationState, rankPresets, requiresApproval, type RoutablePreset } from './evaluation-policy'
export { DEFAULT_EVALUATION_MODEL, AUTO_APPROVAL_TOOLS } from './evaluation-policy'
import type { GithubWriteToolName } from './write-tools'

/**
 * Tuning for `requireApproval: 'auto'` and `preset: 'auto'`. Every field is optional.
 */
export type GithubEvaluationOptions = {
  /**
   * Decision model for AI SDK `experimental_decide`: an AI Gateway ID or a model instance.
   * @default 'typesafe-ai/jev-1.14.0'
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
  /**
   * What `preset: 'auto'` picks. `'tools'` asks the decision model about each tool and lists only
   * the likely ones plus the core read tools (`CORE_READ_TOOLS`), so the model sees far fewer tool
   * definitions. The rest stays reachable: eve defers it, and `createGithubAgent` adds a
   * `callGithubTool` tool. `'presets'` lists the tools of up to `maxPresets` presets and, on
   * `createGithubAgent`, uses their system prompts.
   * @default 'tools'
   */
  selection?: 'presets' | 'tools'
  /**
   * How long a `preset: 'auto'` decision lasts. `'session'` decides once, on the conversation's
   * first request, so the listed tools, and the provider's cached prompt prefix they start, stay
   * the same for the rest of the conversation; later needs go through deferred tools (eve) or
   * `callGithubTool` (`createGithubAgent`, which doesn't support it with `selection: 'presets'`).
   * `'turn'` decides again for each new request, which changes the tool list and makes the
   * provider write the whole conversation to its prompt cache again.
   * @default 'session', except `'turn'` for presets on `createGithubAgent`
   */
  scope?: 'turn' | 'session'
  /**
   * Keeps `createGithubAgent`'s `preset: 'auto'` decisions across processes, such as serverless
   * instances, under keys derived from the request they were made for. Without it, a decision
   * lives in this process's memory, and another process decides again: that costs a decision
   * call, and a different pick changes the tool list and invalidates the provider's prompt cache.
   * The eve extension keeps decisions in the session and ignores this option.
   */
  store?: {
    get: (key: string) => Promise<readonly string[] | undefined>
    set: (key: string, value: readonly string[]) => Promise<void>
  }
  /**
   * Lowest probability for `selection: 'tools'` to list a tool beyond the core read tools.
   * @default 0.5
   */
  minToolProbability?: number
  /**
   * Most tools `selection: 'tools'` lists beyond the core read tools, keeping the most likely ones.
   * @default 8
   */
  maxTools?: number
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
  options: GithubEvaluationOptions = {},
  abortSignal?: AbortSignal,
): Promise<RoutablePreset[]> {
  const { minPresetProbability = 0.7, maxPresets = 2 } = options
  const presets = Object.keys(PRESET_PURPOSES) as RoutablePreset[]
  const probabilities = await decideEach(messages, presets, preset => ({
    instructions: 'Does handling this GitHub request need the tools of this preset?',
    criteria: { true: { purpose: PRESET_PURPOSES[preset], tools: [...PRESET_TOOLS[preset]] } },
  }), options, abortSignal)
  return rankPresets(probabilities, { minPresetProbability, maxPresets })
}

/**
 * Tools the latest user message needs, from one decision call with a yes/no question per tool:
 * the core read tools, plus up to `maxTools` others at or above `minToolProbability`, most likely
 * first. Rejects when the decision call fails; {@link selectTools} falls back instead.
 */
export async function evaluateTools(
  messages: readonly ModelMessage[],
  options: GithubEvaluationOptions = {},
  abortSignal?: AbortSignal,
): Promise<GithubToolName[]> {
  const { minToolProbability = 0.5, maxTools = 8 } = options
  const core: readonly GithubToolName[] = CORE_READ_TOOLS
  const candidates = ALL_GITHUB_TOOL_NAMES.filter(name => !core.includes(name))
  const probabilities = await decideEach(messages, candidates, name => ({
    instructions: 'Does handling this GitHub request need this tool?',
    criteria: { true: { tool: name, description: GITHUB_TOOL_CATALOG[name].description } },
  }), options, abortSignal)
  const likely = candidates
    .filter(name => probabilities[name] >= minToolProbability)
    .toSorted((a, b) => probabilities[b] - probabilities[a])
    .slice(0, maxTools)
  return [...core, ...likely]
}

type BooleanQuestion = { instructions: string, criteria: { true: Record<string, JSONValue> } }

// One boolean question per key against the conversation. A refused question counts as a no:
// ask once more without it instead of losing every answer.
async function decideEach<K extends string>(
  messages: readonly ModelMessage[],
  keys: readonly K[],
  question: (key: K) => BooleanQuestion,
  { model = DEFAULT_EVALUATION_MODEL, providerOptions }: GithubEvaluationOptions,
  abortSignal?: AbortSignal,
): Promise<Record<K, number>> {
  const decide = loadDecide()
  const state = conversationState(messages, messageText)
  const ask = (asked: readonly K[]) => decide({
    model,
    providerOptions,
    state,
    questions: Object.fromEntries(asked.map(key => [key, { type: 'boolean' as const, ...question(key) }])),
    abortSignal,
  })
  const probabilities = Object.fromEntries(keys.map(key => [key, 0])) as Record<K, number>
  const { answers } = await ask(keys).catch((error: unknown) => {
    const refused = refusedQuestions(error)
    const remaining = keys.filter(key => !refused?.includes(key))
    if (!refused || remaining.length === 0) throw error
    return ask(remaining)
  })
  for (const [key, answer] of Object.entries(answers)) probabilities[key as K] = answer.probability
  return probabilities
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
 * Logs `EVALUATION_FAILED` for a failed {@link evaluateTools} call and returns the read-only
 * `repo-explorer` tools. Rethrows when `abortSignal` is aborted.
 */
export function fallbackTools(error: unknown, { model = DEFAULT_EVALUATION_MODEL }: GithubEvaluationOptions = {}, abortSignal?: AbortSignal): GithubToolName[] {
  warnEvaluationFailed(model, 'using the repo-explorer tools', error, abortSignal)
  return [...PRESET_TOOLS['repo-explorer']]
}

/**
 * {@link evaluateTools}, falling back to the read-only `repo-explorer` tools (and logging
 * `EVALUATION_FAILED`) when the decision call fails.
 */
export async function selectTools(
  messages: readonly ModelMessage[],
  options: GithubEvaluationOptions = {},
  abortSignal?: AbortSignal,
): Promise<GithubToolName[]> {
  return evaluateTools(messages, options, abortSignal).catch(error => fallbackTools(error, options, abortSignal))
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
