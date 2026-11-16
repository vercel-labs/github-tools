import githubExtension from '@github-tools/eve-extension'
import { audit } from '../../fixtures/audit'
import { evaluationModel } from '../../fixtures/evaluation'
import '../../fixtures/stubs'

// Every write is recorded by `audit`. Issues need a person, labels are left to the decision
// model, comments run unasked, and `guardrails` keep writes to one repository.
export default githubExtension({
  connector: 'github/eval',
  actAs: 'caller',
  approvers: 'anyone',
  include: ['getRepository', 'createIssue', 'addIssueComment', 'addLabels'],
  requireApproval: { createIssue: 'always', addIssueComment: false, addLabels: 'auto' },
  evaluation: { model: evaluationModel },
  guardrails: { repositories: ['vercel-labs/audited'] },
  audit,
})
