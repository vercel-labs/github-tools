import { defineEvalConfig } from 'eve/evals'

export default defineEvalConfig({
  maxConcurrency: 4,
  timeoutMs: 600_000,
})
