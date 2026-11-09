import githubExtension from '@github-tools/eve-extension'
import { benchSelection, CONFIGS, LEVELS } from '../../lib/configs.ts'
import { benchEvaluator } from '../../lib/evaluator.ts'
import { stubGithubWrites } from '../../lib/stub-writes.ts'

const { config, level } = benchSelection()
stubGithubWrites({ config, level })

const { evaluation, ...extensionConfig } = CONFIGS[config] as (typeof CONFIGS)[keyof typeof CONFIGS] & { evaluation?: object }

export default githubExtension({
  ...extensionConfig,
  evaluation: { ...LEVELS[level], ...evaluation, model: benchEvaluator({ config, level }) },
})
