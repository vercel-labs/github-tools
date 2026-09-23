import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  connector: 'github/test-github-tools',
  preset: 'auto',
  requireApproval: 'auto',
})
