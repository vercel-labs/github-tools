import githubExtension from '@github-tools/eve-extension'

// A second mount in shadow mode: writes are answered without reaching GitHub or asking anyone,
// though `createIssue` keeps its default approval.
export default githubExtension({
  token: 'ghp_smoke',
  include: ['createIssue', 'addLabels'],
  // A policy that denies a call denies it in a dry run too.
  requireApproval: { addLabels: () => ({ type: 'denied', reason: 'Labels are managed by hand.' }) },
  dryRun: true,
})
