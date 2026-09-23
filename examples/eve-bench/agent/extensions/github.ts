import githubExtension from '@github-tools/eve-extension'
import { benchSelection, CONFIGS, LEVELS } from '../../lib/configs.ts'
import { benchEvaluator } from '../../lib/evaluator.ts'
import { stubGithubWrites } from '../../lib/stub-writes.ts'

const { config, level } = benchSelection()
stubGithubWrites({ config, level })

export default githubExtension({
  ...CONFIGS[config],
  evaluation: { ...LEVELS[level], model: benchEvaluator({ config, level }) },
})
