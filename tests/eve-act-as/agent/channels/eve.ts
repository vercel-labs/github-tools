import { eveChannel } from 'eve/channels/eve'
import { localDev } from 'eve/channels/auth'

// `x-eval-user` stands in for a signed-in app user, and `x-eval-commenter` for a person eve's
// GitHub channel identified, with the attributes `defaultGitHubAuth` sets. Without either,
// `localDev()` accepts the request with no user, like a schedule or a local run.
export default eveChannel({
  auth: [
    (request) => {
      const commenter = request.headers.get('x-eval-commenter')
      if (commenter) {
        return {
          authenticator: 'github-webhook',
          issuer: 'github:vercel-labs',
          principalId: `github:${commenter}`,
          principalType: 'user',
          subject: commenter,
          attributes: { repository: 'vercel-labs/github-tools', issue_number: '1', pull_request_number: '', user_login: commenter },
        }
      }
      const user = request.headers.get('x-eval-user')
      if (!user) return null
      return {
        authenticator: 'eval',
        issuer: 'https://eval.test',
        principalId: user,
        principalType: 'user',
        subject: user,
        attributes: {},
      }
    },
    localDev(),
  ],
})
