import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  connector: 'github/test-github-tools',
  preset: 'code-review',
  include: ['createIssue'],
  requireApproval: {
    addPullRequestComment: ({ toolInput }: { toolInput?: { owner?: string } }) => toolInput?.owner !== 'vercel-labs',
  },
})
