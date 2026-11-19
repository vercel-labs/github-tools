import { eveChannel } from 'eve/channels/eve'
import { evalIdentity } from '@github-tools/eve-extension/testing/agent'

export default eveChannel({ auth: [evalIdentity()] })
