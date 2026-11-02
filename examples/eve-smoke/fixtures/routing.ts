import type { Experimental_EvaluationModel } from 'ai'

let calls = 0

/** How many times `preset: 'auto'` routing has called the model in this process. */
export function routingCalls(): number {
  return calls
}

// Answers `preset: 'auto'` routing with issue-triage only.
export const routingModel: Experimental_EvaluationModel = {
  specificationVersion: 'v4',
  provider: 'smoke',
  modelId: 'routing-fixture',
  supportedQuestionTypes: ['boolean'],
  async doDecide({ questions }) {
    calls++
    return {
      answers: Object.fromEntries(Object.keys(questions).map(preset => [
        preset,
        { type: 'boolean' as const, probability: preset === 'issue-triage' ? 0.9 : 0.1 },
      ])),
      warnings: [],
    }
  },
}
