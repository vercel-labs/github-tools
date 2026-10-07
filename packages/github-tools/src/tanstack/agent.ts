import { chat, convertMessagesToModelMessages } from '@tanstack/ai'
import type { AnyTextAdapter, ChatMiddleware, ChatStream } from '@tanstack/ai'
import { resolveInstructions } from '../core/instructions'
import type { GithubToolPreset } from '../core/presets'
import { createGithubTools, type CreateGithubToolsOptions } from './tools'
import { selectPresets, type GithubEvaluationOptions } from './evaluation'
import { createGithubApprovalMiddleware } from './approval'
import { githubToolApproval } from './interrupts'

type NativeOptions<A extends AnyTextAdapter> = Parameters<typeof chat<A, undefined, true>>[0]
type ChatSettings<A extends AnyTextAdapter> = Omit<NativeOptions<A>, 'tools' | 'messages' | 'systemPrompts' | 'context' | 'middleware' | 'interrupts' | 'stream' | 'outputSchema'>

/** Configure a GitHub agent backed by TanStack chat(). */
export type CreateGithubAgentOptions<A extends AnyTextAdapter> = ChatSettings<A> & Omit<CreateGithubToolsOptions, 'preset'> & {
  /** Explicit presets or request-based selection with Jev. */
  preset?: GithubToolPreset | readonly GithubToolPreset[] | 'auto'
  /** Replace the default instructions; repository context is still appended. */
  instructions?: string
  /** Append to default instructions, unless instructions is supplied. */
  additionalInstructions?: string
  /** Evaluator adapter and thresholds for automatic routing and approval. */
  evaluation?: GithubEvaluationOptions
  /** Additional TanStack middleware. GitHub approval runs before these hooks. */
  middleware?: ChatMiddleware[]
}

/** One agent invocation, including TanStack cancellation and continuation options. */
export type GithubAgentCallOptions<A extends AnyTextAdapter> = Omit<Partial<ChatSettings<A>>, 'adapter'> & (
  | { prompt: string, messages?: never }
  | { messages: NonNullable<NativeOptions<A>['messages']>, prompt?: never }
)

/** A reusable, stateless TanStack GitHub agent. */
export type GithubAgent<A extends AnyTextAdapter> = {
  /** Run the tool loop and collect TanStack's text result. Use stream() for approval UIs. */
  generate: (options: GithubAgentCallOptions<A>) => Promise<string>
  /** Run the tool loop as native TanStack events, including approval interrupts. */
  stream: (options: GithubAgentCallOptions<A>) => ChatStream
}

/** Create a GitHub agent with preset instructions, tools, and automatic approval middleware. */
export function createGithubAgent<A extends AnyTextAdapter>({
  token, preset, requireApproval, overrides, context, author, committer, coAuthors,
  instructions, additionalInstructions, evaluation, middleware = [], ...settings
}: CreateGithubAgentOptions<A>): GithubAgent<A> {
  async function prepare(call: GithubAgentCallOptions<A>) {
    const { prompt, messages: suppliedMessages, ...callSettings } = call
    const messages = suppliedMessages ?? [{ role: 'user' as const, content: prompt! }]
    const selected = preset === 'auto'
      ? await selectPresets(convertMessagesToModelMessages(messages), evaluation, (callSettings.abortController ?? settings.abortController)?.signal)
      : preset
    const tools = createGithubTools({ token, preset: selected, requireApproval, overrides, context, author, committer, coAuthors })
    const promptPreset: GithubToolPreset | GithubToolPreset[] | undefined = typeof selected === 'string' || selected === undefined
      ? selected
      : selected.length === 1 ? selected[0] : [...selected]
    return {
      ...settings,
      ...callSettings,
      messages,
      tools,
      systemPrompts: [resolveInstructions({ preset: promptPreset, instructions, additionalInstructions, context })],
      middleware: [createGithubApprovalMiddleware({ tools, evaluation }), ...middleware],
      interrupts: [githubToolApproval],
    }
  }

  return {
    async generate(call) {
      return chat({ ...await prepare(call), stream: false })
    },
    async *stream(call) {
      yield* chat({ ...await prepare(call), stream: true })
    },
  }
}
