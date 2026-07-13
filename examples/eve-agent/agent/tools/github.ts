import { getToken } from '@vercel/connect'
import { createGithubTools } from '@github-tools/sdk/eve'

// TEMP: Vercel Connect instead of GITHUB_TOKEN — connector "test-github-tools" on github-tools-docs
const CONNECTOR_UID = 'github/test-github-ools'

/** Scopes for the maintainer preset — https://github-tools.com/guide/tokens-and-auth */
const MAINTAINER_SCOPES = [
  'contents:read',
  'contents:write',
  'pull_requests:read',
  'pull_requests:write',
  'issues:read',
  'issues:write',
  'actions:read',
  'actions:write',
  'administration:read',
  'administration:write',
] as const

export default createGithubTools({
  preset: 'maintainer',
  token: () => getToken(CONNECTOR_UID, {
    subject: { type: 'app' },
    scopes: [...MAINTAINER_SCOPES],
  }),
})
