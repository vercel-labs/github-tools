import { connectGithubTools } from '@github-tools/sdk/connect/eve'

export default connectGithubTools('github/test-github-tools', {
  preset: 'maintainer',
})
