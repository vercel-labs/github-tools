import { eveChannel } from 'eve/channels/eve'
import { localDev } from 'eve/channels/auth'

// `x-eval-principal: user:<id>` or `service:<id>` stands in for an authenticated caller.
export default eveChannel({
  auth: [
    (request) => {
      const [principalType, principalId] = request.headers.get('x-eval-principal')?.split(':') ?? []
      if (!principalType || !principalId) return null
      return { authenticator: 'eval', issuer: 'https://eval.test', principalId, principalType, subject: principalId, attributes: {} }
    },
    localDev(),
  ],
})
