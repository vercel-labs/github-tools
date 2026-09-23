import type githubExtension from '@github-tools/eve-extension'
import type { GithubEvaluationOptions } from '@github-tools/sdk/eve-runtime'

type GithubExtensionConfig = NonNullable<Parameters<typeof githubExtension>[0]>

/** Extension configurations the benchmark compares, selected with `BENCH_CONFIG`. */
export const CONFIGS = {
  'all': {},
  'fixed': { preset: ['code-review', 'issue-triage'] },
  'auto-preset': { preset: 'auto' },
  'auto': { preset: 'auto', requireApproval: 'auto' },
} satisfies Record<string, Omit<GithubExtensionConfig, 'evaluation'>>

/** Confidence levels for the `'auto'` modes, selected with `BENCH_LEVEL`. */
export const LEVELS = {
  conservative: { minPresetProbability: 0.8, maxPresets: 1, maxRisk: 0.25, minIntent: 0.95 },
  default: {},
  permissive: { minPresetProbability: 0.3, maxPresets: 3, maxRisk: 1, minIntent: 0.6 },
} satisfies Record<string, Omit<GithubEvaluationOptions, 'model'>>

export type BenchConfigId = keyof typeof CONFIGS
export type BenchLevel = keyof typeof LEVELS

export function benchSelection(): { config: BenchConfigId, level: BenchLevel } {
  const config = (process.env.BENCH_CONFIG ?? 'all') as BenchConfigId
  const level = (process.env.BENCH_LEVEL ?? 'default') as BenchLevel
  if (!(config in CONFIGS)) throw new Error(`Unknown BENCH_CONFIG "${config}"`)
  if (!(level in LEVELS)) throw new Error(`Unknown BENCH_LEVEL "${level}"`)
  return { config, level }
}
