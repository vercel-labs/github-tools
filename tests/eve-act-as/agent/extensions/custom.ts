import githubExtension from '@github-tools/eve-extension'
import '../../fixtures/stubs'

// Every call runs as the signed-in user, and a pull request ends with this mount's own footer.
export default githubExtension({
  connector: 'github/eval',
  actAs: 'user',
  attribution: { footer: app => `Opened through the ${app.slug} App.` },
  include: ['createPullRequest'],
  requireApproval: { createPullRequest: 'never' },
})
