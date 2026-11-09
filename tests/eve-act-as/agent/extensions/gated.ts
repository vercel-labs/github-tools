import githubExtension from '@github-tools/eve-extension'
import { always } from 'eve/tools/approval'
import '../../fixtures/stubs'

// Writes run as the App, and only alice may approve them, whoever asked.
export default githubExtension({
  connector: 'github/eval',
  include: ['createIssue', 'updateIssue'],
  context: { pullNumber: 12 },
  requireApproval: {
    createIssue: {
      request: always(),
      response: ({ response }) => response.decision === 'deny' || response.principal.principalId === 'alice'
        ? { status: 'allowed' }
        : { status: 'rejected', reason: 'Only alice can approve.' },
    },
    updateIssue: 'always',
  },
})
