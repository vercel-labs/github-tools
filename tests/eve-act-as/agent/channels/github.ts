import { githubChannel } from '@github-tools/eve-extension/channels'
import '../../fixtures/stubs'

// The channel as an agent mounts it, with a stubbed App token and no webhook signature to check.
export default githubChannel({
  botName: 'eval-agent',
  credentials: { installationToken: 'ghs_app', webhookVerifier: () => true },
  respondTo: 'writers',
})
