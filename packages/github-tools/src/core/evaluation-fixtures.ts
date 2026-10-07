export const approvalCases = [
  { risk: 1, intent: 0.6, options: {}, expected: false },
  { risk: 1.01, intent: 1, options: {}, expected: true },
  { risk: 0, intent: 0.59, options: {}, expected: true },
  { risk: 2, intent: 0.5, options: { maxRisk: 2, minIntent: 0.5 }, expected: false },
]

export const presetCases = [
  { probabilities: {}, options: {}, expected: ['repo-explorer'] },
  { probabilities: { 'code-review': 0.7, 'ci-ops': 0.7 }, options: { maxPresets: 1 }, expected: ['code-review'] },
  { probabilities: { 'repo-explorer': 1, 'ci-ops': 0.7 }, options: {}, expected: ['ci-ops'] },
  { probabilities: { 'ci-ops': 0.3 }, options: {}, expected: ['ci-ops'] },
  { probabilities: { 'code-review': 0.8, 'ci-ops': 0.9 }, options: { minPresetProbability: 0.85 }, expected: ['ci-ops'] },
] as const
