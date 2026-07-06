export const GITHUB_WRITE_TOOL_NAMES = [
  'createBranch',
  'forkRepository',
  'createRepository',
  'createOrUpdateFile',
  'createPullRequest',
  'mergePullRequest',
  'addPullRequestComment',
  'createPullRequestReview',
  'createIssue',
  'addIssueComment',
  'closeIssue',
  'addLabels',
  'removeLabel',
  'createGist',
  'updateGist',
  'deleteGist',
  'createGistComment',
  'triggerWorkflow',
  'cancelWorkflowRun',
  'rerunWorkflowRun',
] as const

export type GithubWriteToolName = typeof GITHUB_WRITE_TOOL_NAMES[number]
