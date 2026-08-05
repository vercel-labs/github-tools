import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  connector: 'github/test-github-tools',
  preset: 'code-review',
  // tools: ['getRepository', 'listPullRequests', 'mergePullRequest'],
  requireApproval: {
    addPullRequestComment: ({ toolInput }: { toolInput?: { owner?: string } }) => toolInput?.owner !== 'vercel-labs',
  },
})
