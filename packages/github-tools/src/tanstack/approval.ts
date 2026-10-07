import { isDeepStrictEqual } from 'node:util'
import type { ChatMiddleware, ChatMiddlewareContext, Tool } from '@tanstack/ai'
import { autoTools } from './tools'
import { needsAutoApproval, type GithubEvaluationOptions } from './evaluation'
import { githubToolApproval } from './interrupts'

type Decision = { toolCallId: string, toolName: string, input: Record<string, unknown>, approved: boolean }
type RunState = { decisions: Decision[] }

/** Options for GitHub approval middleware. Register githubToolApproval with chat(). */
export type GithubApprovalMiddlewareOptions = {
  tools: readonly Tool[]
  evaluation?: GithubEvaluationOptions
}

/** Evaluate automatic GitHub writes before execution and request review through githubToolApproval. */
export function createGithubApprovalMiddleware({ tools, evaluation }: GithubApprovalMiddlewareOptions): ChatMiddleware<unknown, typeof githubToolApproval> {
  const managed = new Map(tools.flatMap(tool => {
    const info = autoTools.get(tool)
    return info ? [[tool.name, { tool, ...info }] as const] : []
  }))
  const runs = new WeakMap<ChatMiddlewareContext, RunState>()
  const state = (ctx: ChatMiddlewareContext) => runs.get(ctx)!
  const decisionFor = (ctx: ChatMiddlewareContext, toolCallId: string | undefined, toolName: string, input: unknown) =>
    state(ctx).decisions.find(decision => decision.toolCallId === toolCallId && decision.toolName === toolName && isDeepStrictEqual(decision.input, input))

  return {
    name: 'github-tools.approval',
    onConfig(ctx, config) {
      if (ctx.phase === 'init') runs.set(ctx, { decisions: [] })
      return {
        tools: config.tools?.map(tool => {
          const info = managed.get(tool.name)
          if (!info || tool !== info.tool) return tool
          return {
            ...tool,
            needsApproval: false,
            execute: async (input, execution) => {
              const resolved = info.resolveInput(input)
              if (!decisionFor(ctx, execution?.toolCallId, tool.name, resolved)?.approved) {
                throw new Error(`GitHub tool ${tool.name} has no approval for this input.`)
              }
              return tool.execute!(resolved, execution)
            },
          }
        }),
      }
    },
    onInterruptResolution(ctx, resolutions) {
      for (const resolution of resolutions.for(githubToolApproval)) {
        const payload = resolution.request.payload
        if (!payload || !managed.has(payload.toolName)) continue
        state(ctx).decisions.push({ ...payload, approved: resolution.status === 'resolved' && resolution.response.approved })
      }
    },
    async onInterruptBoundary(ctx) {
      if (ctx.phase !== 'beforeTools') return
      const completed = new Set(ctx.messages.filter(message => message.role === 'tool').map(message => message.toolCallId))
      const calls = ctx.messages.flatMap(message => message.role === 'assistant' ? message.toolCalls ?? [] : []).filter(call => !completed.has(call.id))
      const interrupts = []
      for (const call of calls) {
        const info = managed.get(call.function.name)
        if (!info) continue
        const input = info.resolveInput(JSON.parse(call.function.arguments))
        if (decisionFor(ctx, call.id, info.name, input)) continue
        const needsApproval = await needsAutoApproval(info.name, input, ctx.messages, evaluation, ctx.signal)
        if (needsApproval) {
          interrupts.push(githubToolApproval.interrupt({
            key: call.id,
            reason: 'github-tool-approval',
            message: `Approve ${info.name}?`,
            payload: { toolCallId: call.id, toolName: info.name, input },
          }))
        } else {
          state(ctx).decisions.push({ toolCallId: call.id, toolName: info.name, input, approved: true })
        }
      }
      if (interrupts.length) return { interrupts }
    },
    onBeforeToolCall(ctx, call) {
      const info = managed.get(call.toolName)
      if (!info) return
      const decision = decisionFor(ctx, call.toolCallId, call.toolName, info.resolveInput(call.args))
      if (!decision) return { type: 'skip', result: { error: 'No approval recorded for this GitHub tool call and input.' } }
      if (!decision.approved) return { type: 'skip', result: { error: 'User denied this GitHub tool call.' } }
    },
  }
}
