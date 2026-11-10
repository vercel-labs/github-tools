import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  connector: 'github/github-agent',
  preset: 'auto',
  exclude: ['createRepository', 'forkRepository', 'createGist', 'updateGist', 'deleteGist', 'createGistComment'],
  requireApproval: 'auto',
  // The GitHub channel checks the commenter's access to the repository of the thread and no other,
  // so a turn started there only gets tokens for that repository.
  connect: ({ session }) => {
    const auth = session.auth.current
    if (auth?.authenticator !== 'github-webhook') return {}
    const [org, repo] = String(auth.attributes.repository).split('/')
    if (!org || !repo) throw new Error('GitHub channel turn without a repository')
    return { authorizationDetails: [{ type: 'github_app_installation', org, repositories: [repo] }] }
  },
})
