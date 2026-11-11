import githubExtension from '@github-tools/eve-extension'

// A signed-in person's turn runs with their own GitHub token, and a turn with no person runs as
// the App. Both tokens come from Vercel Connect, which the eval run emulates.
export default githubExtension({
  connector: 'github/eval',
  actAs: 'caller',
  approvers: 'anyone',
  include: ['getRepository', 'addLabels'],
  requireApproval: { addLabels: 'always' },
})
