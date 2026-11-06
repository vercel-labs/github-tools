import githubExtension from '@github-tools/eve-extension'
import { evaluationModel } from '../../fixtures/evaluation'
import '../../fixtures/stubs'

export default githubExtension({
  connector: 'github/eval',
  preset: 'auto',
  requireApproval: 'auto',
  evaluation: { model: evaluationModel },
})
