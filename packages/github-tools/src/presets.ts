/**
 * Tool name and preset metadata shared by the SDK entry point and the
 * scaffold CLI. This module must stay free of runtime imports (`ai`, `zod`,
 * `octokit`) so the CLI can bundle it without pulling in peer dependencies.
 */

/** Every tool exposed by `createGithubTools`, in catalog order. */
export const GITHUB_TOOL_NAMES = [
  'getRepository',
  'listBranches',
  'getFileContent',
  'listPullRequests',
  'getPullRequest',
  'listIssues',
  'getIssue',
  'searchCode',
  'searchRepositories',
  'listCommits',
  'getCommit',
  'getBlame',
  'createBranch',
  'forkRepository',
  'createRepository',
  'createOrUpdateFile',
  'createPullRequest',
  'mergePullRequest',
  'addPullRequestComment',
  'listPullRequestFiles',
  'listPullRequestReviews',
  'createPullRequestReview',
  'createIssue',
  'addIssueComment',
  'closeIssue',
  'listLabels',
  'addLabels',
  'removeLabel',
  'listGists',
  'getGist',
  'listGistComments',
  'createGist',
  'updateGist',
  'deleteGist',
  'createGistComment',
  'listWorkflows',
  'listWorkflowRuns',
  'getWorkflowRun',
  'listWorkflowJobs',
  'triggerWorkflow',
  'cancelWorkflowRun',
  'rerunWorkflowRun',
] as const

export type GithubToolName = (typeof GITHUB_TOOL_NAMES)[number]

/** Tools that perform write operations and require approval by default. */
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
] as const satisfies readonly GithubToolName[]

export type GithubWriteToolName = (typeof GITHUB_WRITE_TOOL_NAMES)[number]

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

export const PRESET_TOOLS: Record<GithubToolPreset, readonly GithubToolName[]> = {
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
