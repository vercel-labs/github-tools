import type { Experimental_EvaluationModel } from 'ai'

// Rates every write negligible and asked for, so `requireApproval: 'auto'` lets it run.
export const evaluationModel: Experimental_EvaluationModel = {
  specificationVersion: 'v4',
  provider: 'eval',
  modelId: 'evaluation-fixture',
  supportedQuestionTypes: ['boolean', 'score'],
  async doDecide() {
    return {
      answers: { risk: { type: 'score', score: 0 }, intent: { type: 'boolean', probability: 1 } },
      warnings: [],
    }
  },
}
