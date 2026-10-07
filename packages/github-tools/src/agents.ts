import { ToolLoopAgent } from 'ai'
import type { ToolLoopAgentSettings, ToolSet } from 'ai'
import { createGithubTools } from './index'
import type { AllGithubTools, GithubToolsBaseOptions } from './core/tool-types'
import { resolvePresetTools, type CombinedPresetToolNames, type GithubToolPreset, type PresetToolName } from './core/presets'
import { selectPresets } from './core/evaluation'
import type { GithubToolName } from './core/tool-names'
import { resolveInstructions } from './core/instructions'
export { resolveInstructions } from './core/instructions'

type AgentOptions = Omit<ToolLoopAgentSettings<ToolSet>, 'model' | 'tools' | 'instructions'>

export type CreateGithubAgentOptions = AgentOptions & GithubToolsBaseOptions & {
  model: ToolLoopAgentSettings<ToolSet>['model']
  /**
   * Restrict tools and system prompt to a predefined preset.
   *
   * Selects a subset of tools and, when a single preset is passed,
   * sets a matching system prompt. Combine presets with an array to merge tool sets.
   *
   * `'auto'` picks presets per call from the latest user message with an evaluation model
   * (Jev by default, see `evaluation`), then narrows `activeTools` and uses the matching
   * system prompt. Combines at most two presets (`evaluation.maxPresets`), and only uses
   * read-only `repo-explorer` when no other preset qualifies; when none clears the threshold,
   * uses the most likely one. Never exposes the full catalog. Needs `ai` 7.0.105 or later.
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
  context,
  instructions,
  additionalInstructions,
  author,
  committer,
  coAuthors,
  ...agentOptions
}: CreateGithubAgentOptions): ToolLoopAgent<never, AllGithubTools | Pick<AllGithubTools, GithubToolName>> {
  const staticPreset = preset === 'auto' ? undefined : preset
  const tools = createGithubTools({ token, requireApproval, evaluation, preset: staticPreset, context, author, committer, coAuthors })
  const settings = {
    ...agentOptions,
    tools,
    instructions: resolveInstructions({ preset: staticPreset, instructions, additionalInstructions, context }),
  } as ToolLoopAgentSettings<never, typeof tools>

  if (preset === 'auto') {
    const prepareCall = agentOptions.prepareCall as typeof settings.prepareCall
    settings.prepareCall = async (call) => {
      const messages = typeof call.prompt === 'string'
        ? [{ role: 'user' as const, content: call.prompt }]
        : call.prompt ?? call.messages ?? []
      const selected = await selectPresets(messages, evaluation)
      const next = {
        ...call,
        activeTools: [...resolvePresetTools(selected)!],
        instructions: resolveInstructions({ preset: selected.length === 1 ? selected[0] : selected, instructions, additionalInstructions, context }),
      }
      return prepareCall ? prepareCall(next) : next
    }
  }

  return new ToolLoopAgent(settings) as ToolLoopAgent<never, typeof tools>
}
