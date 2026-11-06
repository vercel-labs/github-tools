import githubExtension from '@github-tools/eve-extension'
import '../../fixtures/stubs'

// Autonomous turns run as the App; a signed-in user's turn runs as them, and any signed-in
// user can approve a write, which then runs with the approver's token.
export default githubExtension({
  connector: 'github/eval',
  actAs: 'caller',
  approvers: 'anyone',
  include: ['getRepository', 'createIssue'],
  requireApproval: { createIssue: 'always' },
})
