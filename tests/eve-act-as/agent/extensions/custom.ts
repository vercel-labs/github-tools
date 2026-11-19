import githubExtension from '@github-tools/eve-extension'
import '../../fixtures/stubs'

// Every call runs as the signed-in user, and a pull request ends with a footer template that uses every token.
export default githubExtension({
  connector: 'github/eval',
  actAs: 'user',
  attribution: { footer: 'Opened in {channel} for {requester}, through {app} ({app.name}).' },
  include: ['createPullRequest'],
  requireApproval: { createPullRequest: 'never' },
})
