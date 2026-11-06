import githubExtension from '@github-tools/eve-extension'
import { evaluationModel } from '../../fixtures/evaluation'
import '../../fixtures/stubs'

// Lists only the tools the decision model picks for the session's first request, plus the core
// read tools; the rest is deferred.
export default githubExtension({
  connector: 'github/eval',
  preset: 'auto',
  evaluation: { model: evaluationModel, selection: 'tools' },
})
