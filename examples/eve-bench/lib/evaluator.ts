import type { Experimental_EvaluationModel } from 'ai'
import { createGateway, gateway } from 'ai'
import { logLine } from './log.ts'

type EvaluationModel = Exclude<Experimental_EvaluationModel, string>

/**
 * Jev, logging every call to `evaluator.jsonl`. Uses `JEV_GATEWAY_API_KEY` when set,
 * so the agent and Jev can bill different AI Gateway teams.
 */
export function benchEvaluator(tags: Record<string, string>): EvaluationModel {
  const jevGateway = process.env.JEV_GATEWAY_API_KEY ? createGateway({ apiKey: process.env.JEV_GATEWAY_API_KEY }) : gateway
  const base = jevGateway.evaluationModel('typesafe-ai/jev')
  return {
    ...base,
    specificationVersion: 'v4',
    provider: base.provider,
    modelId: base.modelId,
    supportedQuestionTypes: base.supportedQuestionTypes,
    async doEvaluate(options) {
      const started = performance.now()
      const result = await base.doEvaluate(options)
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
