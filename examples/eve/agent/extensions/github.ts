import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  connector: 'github/github-agent',
  preset: 'auto',
  exclude: ['createRepository', 'forkRepository', 'createGist', 'updateGist', 'deleteGist', 'createGistComment'],
  requireApproval: 'auto',
})
