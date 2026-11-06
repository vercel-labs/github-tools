import { eveChannel } from 'eve/channels/eve'
import { localDev } from 'eve/channels/auth'

// `x-eval-user` stands in for a signed-in app user. Without it, `localDev()` accepts the
// request with no user, like a schedule or a local run.
export default eveChannel({
  auth: [
    (request) => {
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
