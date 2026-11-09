import type { Experimental_EvaluationModel } from 'ai'
import { createGateway, gateway } from 'ai'
import { logLine } from './log.ts'

type DecisionModel = Exclude<Experimental_EvaluationModel, string>

/**
 * Jev, logging every call to `evaluator.jsonl`. Uses `JEV_GATEWAY_API_KEY` when set,
 * so the agent and Jev can bill different AI Gateway teams, and `BENCH_DECISION_MODEL`
 * to compare another decision model or a pinned Jev version.
 */
export function benchEvaluator(tags: Record<string, string>): DecisionModel {
  const jevGateway = process.env.JEV_GATEWAY_API_KEY ? createGateway({ apiKey: process.env.JEV_GATEWAY_API_KEY }) : gateway
  const base = jevGateway.decisionModel(process.env.BENCH_DECISION_MODEL ?? 'typesafe-ai/jev-1.14.0')
  return {
    ...base,
    specificationVersion: 'v4',
    provider: base.provider,
    modelId: base.modelId,
    supportedQuestionTypes: base.supportedQuestionTypes,
    async doDecide(options) {
      const started = performance.now()
      const result = await base.doDecide(options)
      logLine('evaluator.jsonl', {
        ...tags,
        kind: 'risk' in options.questions ? 'approval' : 'routing',
        state: options.state,
        answers: result.answers,
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        ms: Math.round(performance.now() - started),
      })
      return result
    },
  }
}
