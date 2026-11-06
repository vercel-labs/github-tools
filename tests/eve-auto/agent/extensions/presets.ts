import githubExtension from '@github-tools/eve-extension'
import { evaluationModel } from '../../fixtures/evaluation'
import '../../fixtures/stubs'

// Routes to presets instead of picking single tools.
export default githubExtension({
  connector: 'github/eval',
  preset: 'auto',
  evaluation: { model: evaluationModel, selection: 'presets' },
})
