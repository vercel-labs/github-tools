import type { EvaluateAdapter, TextAdapter, ModelMessage, StreamChunk, TextOptions, ToolCall, WireAnswer } from '@tanstack/ai'

export function evaluator(answer: (state: object) => Record<string, number> | Error = () => ({ risk: 0, intent: 1 })) {
  const calls: Parameters<EvaluateAdapter['evaluate']>[0][] = []
  const adapter: EvaluateAdapter = {
    kind: 'evaluate', name: 'test-evaluator', model: 'test-jev', '~types': { providerOptions: {} },
    async evaluate(options) {
      calls.push(options)
      const values = answer(options.state as object)
      if (values instanceof Error) throw values
      const answers = Object.fromEntries(Object.entries(options.questions).map(([key, question]): [string, WireAnswer] => [key,
        question.type === 'score'
          ? { type: 'score', score: values[key] ?? 0, legend: { '0': 'low', '1': 'medium', '2': 'high' }, probabilities: { '0': 1, '1': 0, '2': 0 }, confidence: 1 }
          : { type: 'noul', noul: values[key] ?? 0 },
      ]))
      return { model: 'test-jev', answers, usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } }
    },
  }
  return { adapter, calls }
}

export class TestTextAdapter implements TextAdapter<'test-model', { temperature?: number }, readonly ['text'], { text: never, image: never, audio: never, video: never, document: never }> {
  readonly name = 'test'
  readonly kind = 'text' as const
  readonly model = 'test-model'
  declare '~types': TextAdapter<'test-model', { temperature?: number }, readonly ['text'], { text: never, image: never, audio: never, video: never, document: never }>['~types']
  calls: TextOptions<{ temperature?: number }>[] = []
  constructor(private readonly propose: (messages: ModelMessage[]) => ToolCall[] = () => []) {}
  async *chatStream(options: TextOptions<{ temperature?: number }>): AsyncGenerator<StreamChunk> {
    this.calls.push(options)
    const calls = this.propose(options.messages)
    const runId = `model-${this.calls.length}`
    yield { type: 'RUN_STARTED', threadId: 'test-thread', runId } as StreamChunk
    for (const call of calls) {
      yield { type: 'TOOL_CALL_START', toolCallId: call.id, toolCallName: call.function.name } as StreamChunk
      yield { type: 'TOOL_CALL_ARGS', toolCallId: call.id, delta: call.function.arguments } as StreamChunk
      yield { type: 'TOOL_CALL_END', toolCallId: call.id } as StreamChunk
    }
    if (!calls.length) {
      yield { type: 'TEXT_MESSAGE_START', messageId: runId, role: 'assistant' } as StreamChunk
      yield { type: 'TEXT_MESSAGE_CONTENT', messageId: runId, delta: 'Done.' } as StreamChunk
      yield { type: 'TEXT_MESSAGE_END', messageId: runId } as StreamChunk
    }
    yield { type: 'RUN_FINISHED', threadId: 'test-thread', runId, metadata: { tanstack: { finishReason: calls.length ? 'tool_calls' : 'stop' } } } as StreamChunk
  }
  async structuredOutput(): Promise<never> { throw new Error('Not used in text tests') }
}

export function toolCall(name = 'addLabels', input: Record<string, unknown> = { owner: 'vercel', repo: 'ai', issueNumber: 12, labels: ['bug'] }, id = 'call-1'): ToolCall {
  return { id, type: 'function', function: { name, arguments: JSON.stringify(input) } }
}

export async function collect(stream: AsyncIterable<StreamChunk>) {
  return Array.fromAsync(stream)
}
