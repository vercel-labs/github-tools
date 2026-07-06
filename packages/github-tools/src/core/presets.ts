/**
 * Predefined tool presets for common use cases.
 *
 * - `'code-review'` — Review PRs: read PRs, file content, commits, and post comments
 * - `'issue-triage'` — Triage issues: read/create/close issues, search, and comment
 * - `'repo-explorer'` — Explore repos: read-only access to repos, branches, code, and search
 * - `'ci-ops'`        — CI operations: monitor and manage GitHub Actions workflows
 * - `'maintainer'`   — Full maintenance: all read + create PRs, merge, manage issues
 */
export type GithubToolPreset = 'code-review' | 'issue-triage' | 'repo-explorer' | 'ci-ops' | 'maintainer'

export const PRESET_TOOLS: Record<GithubToolPreset, string[]> = {
  'code-review': [
    'getPullRequest', 'listPullRequests', 'listPullRequestFiles', 'listPullRequestReviews', 'getFileContent', 'listCommits', 'getCommit', 'getBlame',
    'getRepository', 'listBranches', 'searchCode',
    'addPullRequestComment', 'createPullRequestReview'
  ],
  'issue-triage': [
    'listIssues', 'getIssue', 'createIssue', 'addIssueComment', 'closeIssue',
    'listLabels', 'addLabels', 'removeLabel',
    'getRepository', 'searchRepositories', 'searchCode'
  ],
  'ci-ops': [
    'getRepository', 'listBranches',
    'listCommits', 'getCommit',
    'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs',
    'triggerWorkflow', 'cancelWorkflowRun', 'rerunWorkflowRun'
  ],
  'repo-explorer': [
    'getRepository', 'listBranches', 'getFileContent',
    'listPullRequests', 'getPullRequest', 'listPullRequestFiles', 'listPullRequestReviews',
    'listIssues', 'getIssue',
    'listLabels',
    'listCommits', 'getCommit', 'getBlame',
    'searchCode', 'searchRepositories',
    'listGists', 'getGist', 'listGistComments',
    'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs'
  ],
  'maintainer': [
    'getRepository', 'listBranches', 'getFileContent', 'createBranch', 'forkRepository', 'createRepository', 'createOrUpdateFile',
    'listPullRequests', 'getPullRequest', 'listPullRequestFiles', 'listPullRequestReviews', 'createPullRequest', 'mergePullRequest', 'addPullRequestComment', 'createPullRequestReview',
    'listIssues', 'getIssue', 'createIssue', 'addIssueComment', 'closeIssue',
    'listLabels', 'addLabels', 'removeLabel',
    'listCommits', 'getCommit', 'getBlame',
    'searchCode', 'searchRepositories',
    'listGists', 'getGist', 'listGistComments', 'createGist', 'updateGist', 'deleteGist', 'createGistComment',
    'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs', 'triggerWorkflow', 'cancelWorkflowRun', 'rerunWorkflowRun'
  ]
}

export function resolvePresetTools(preset: GithubToolPreset | GithubToolPreset[]): Set<string> | null {
  if (!preset) return null
  const presets = Array.isArray(preset) ? preset : [preset]
  const tools = new Set<string>()
  for (const p of presets) {
    for (const t of PRESET_TOOLS[p]) tools.add(t)
  }
  return tools
}
