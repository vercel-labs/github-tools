import { chat, convertMessagesToModelMessages } from '@tanstack/ai'
import type { AnyTextAdapter, ChatMiddleware, ChatStream } from '@tanstack/ai'
import { resolveInstructions } from '../core/instructions'
import { PRESET_TOOLS, type GithubToolPreset } from '../core/presets'
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
  /** Collect TanStack's text result. Throws on interrupts; use stream() for approval UIs. */
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
    const modelMessages = convertMessagesToModelMessages(messages)
    const continuingAuto = preset === 'auto' && Boolean((callSettings.resume ?? settings.resume)?.length)
    const selected = preset === 'auto'
      ? continuingAuto ? 'repo-explorer' : await selectPresets(modelMessages, evaluation, (callSettings.abortController ?? settings.abortController)?.signal)
      : preset
    const availableTools = createGithubTools({ token, preset: continuingAuto ? undefined : selected, requireApproval, overrides, context, author, committer, coAuthors })
    const completed = new Set(modelMessages.filter(message => message.role === 'tool').map(message => message.toolCallId))
    const pendingNames = new Set(modelMessages.flatMap(message => message.role === 'assistant' ? message.toolCalls ?? [] : [])
      .filter(call => !completed.has(call.id)).map(call => call.function.name))
    const continuationNames = new Set<string>([...PRESET_TOOLS['repo-explorer'], ...pendingNames])
    const tools = continuingAuto ? availableTools.filter(tool => continuationNames.has(tool.name)) : availableTools
    const promptPreset: GithubToolPreset | GithubToolPreset[] | undefined = typeof selected === 'string' || selected === undefined
      ? selected
      : selected.length === 1 ? selected[0] : [...selected]
    return {
      ...settings,
      ...callSettings,
      messages,
      tools,
      systemPrompts: [resolveInstructions({ preset: continuingAuto ? undefined : promptPreset, instructions, additionalInstructions, context })],
      middleware: [createGithubApprovalMiddleware({ tools, evaluation }), ...middleware],
      interrupts: [githubToolApproval],
    }
  }

  return {
    async generate(call) {
      const prepared = await prepare(call)
      let interrupted = false
      const observeInterrupt: ChatMiddleware = {
        name: 'github-tools.generate',
        onChunk(_ctx, chunk) {
          if (chunk.type === 'RUN_FINISHED' && chunk.outcome?.type === 'interrupt') interrupted = true
        },
      }
      const text = await chat({ ...prepared, middleware: [observeInterrupt, ...prepared.middleware], stream: false })
      if (interrupted) throw new Error('GitHub agent requires review. Use stream() to handle approval interrupts and continuation.')
      return text
    },
    async *stream(call) {
      yield* chat({ ...await prepare(call), stream: true })
    },
  }
}
