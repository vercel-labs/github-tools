import githubExtension from '@github-tools/eve-extension'
import '../../fixtures/stubs'

// Every call runs as the signed-in user, only the requester can approve, and the App is not credited.
export default githubExtension({
  connector: 'github/eval',
  actAs: 'user',
  attribution: false,
  include: ['getRepository', 'createIssue', 'createPullRequest'],
  requireApproval: { createIssue: 'always', createPullRequest: 'never' },
})
