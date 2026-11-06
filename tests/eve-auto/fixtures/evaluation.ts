import type { Experimental_EvaluationModel } from 'ai'
import { recorded } from './record'

type Answer = { type: 'boolean', probability: number } | { type: 'score', score: number }

// Routes every request to issue-triage. Rates adding `bug` negligible and asked for, and any other label hard to undo.
export const evaluationModel: Experimental_EvaluationModel = {
  specificationVersion: 'v4',
  provider: 'eval',
  modelId: 'evaluation-fixture',
  supportedQuestionTypes: ['boolean', 'score'],
  async doDecide({ questions, state }) {
    const answers: Record<string, Answer> = {}
    if ('risk' in questions) {
      recorded().approvalEvaluations++
      const labels = JSON.stringify(state).includes('"bug"') ? 0 : 2
      answers.risk = { type: 'score', score: labels }
      answers.intent = { type: 'boolean', probability: 1 }
    }
    else {
      for (const preset of Object.keys(questions)) answers[preset] = { type: 'boolean', probability: preset === 'issue-triage' ? 0.9 : 0.1 }
    }
    return { answers, warnings: [] }
  },
}
