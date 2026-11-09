import { eveChannel } from 'eve/channels/eve'
import { localDev } from 'eve/channels/auth'

// `x-eval-github: owner/repo#12` stands in for a turn from eve's GitHub channel, which sets these
// attributes in `defaultGitHubAuth`. Without it, `localDev()` accepts the request as before.
export default eveChannel({
  auth: [
    (request) => {
      const thread = request.headers.get('x-eval-github')?.match(/^([^/]+\/[^#]+)#(\d+)$/)
      if (!thread) return null
      return {
        authenticator: 'github-webhook',
        issuer: 'github:vercel-labs',
        principalId: 'github:1',
        principalType: 'user',
        subject: 'octocat',
        attributes: { repository: thread[1]!, issue_number: thread[2]!, pull_request_number: '', user_login: 'octocat' },
      }
    },
    localDev(),
  ],
})
