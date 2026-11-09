import githubExtension from '@github-tools/eve-extension'
import { evaluationModel } from '../../fixtures/evaluation'
import '../../fixtures/stubs'

// Picks tools again for every new request instead of once per session.
export default githubExtension({
  connector: 'github/eval',
  preset: 'auto',
  evaluation: { model: evaluationModel, scope: 'turn' },
})
