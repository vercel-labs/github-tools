import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  connector: 'github/github-agent',
  actAs: 'caller',
  preset: 'auto',
  requireApproval: 'auto',
})
