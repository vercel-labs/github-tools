import githubExtension from '@github-tools/eve-extension'

// A second mount: writes are answered without reaching GitHub.
export default githubExtension({
  token: 'ghp_smoke',
  include: ['createIssue'],
  requireApproval: false,
  dryRun: true,
})
