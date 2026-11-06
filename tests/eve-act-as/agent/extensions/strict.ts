import githubExtension from '@github-tools/eve-extension'
import '../../fixtures/stubs'

// Every call runs as the signed-in user, and only the requester can approve.
export default githubExtension({
  connector: 'github/eval',
  actAs: 'user',
  include: ['getRepository', 'createIssue'],
  requireApproval: { createIssue: 'always' },
})
