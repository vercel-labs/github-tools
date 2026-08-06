import type { GithubToolName } from './tool-names'

/**
 * Predefined tool presets for common use cases.
 * Pass to {@link createGithubTools}, {@link createGithubAgent}, or {@link createDurableGithubAgent}.
 * Presets can be combined by passing an array.
 */
export const PRESET_TOOLS = {
  /**
   * **Code review** — review pull requests and submit feedback.
   *
   * Tools: `getPullRequest`, `listPullRequests`, `listPullRequestFiles`, `listPullRequestReviews`, `getPullRequestContext`,
   * `getFileContent`, `listCommits`, `getCommit`, `getBlame`, `compareCommits`, `getRepository`, `listBranches`,
   * `searchCode`, `listCheckRuns`, `getCombinedStatus`, `addPullRequestComment`, `createPullRequestReview`, `requestReviewers`.
   *
   * Agent prompt: optimized for thorough PR review with inline feedback.
   */
  'code-review': [
    'getPullRequest', 'listPullRequests', 'listPullRequestFiles', 'listPullRequestReviews', 'getPullRequestContext', 'getFileContent', 'listCommits', 'getCommit', 'getBlame', 'compareCommits',
    'getRepository', 'listBranches', 'searchCode', 'listCheckRuns', 'getCombinedStatus',
    'addPullRequestComment', 'createPullRequestReview', 'requestReviewers',
  ],
  /**
   * **Issue triage** — manage and organize GitHub issues.
   *
   * Tools: `listIssues`, `getIssueContext`, `createIssue`, `addIssueComment`, `closeIssue`,
   * `addLabels`, `removeLabel`, `addAssignees`, `removeAssignees`, `getRepository`, `searchRepositories`, `searchCode`.
   *
   * Prefer `getIssueContext` (issue + `labelNames` + recent comments) over separate get/list calls.
   * Agent prompt: optimized for categorizing, labeling, and responding to issues.
   */
  'issue-triage': [
    'listIssues', 'getIssueContext', 'createIssue', 'addIssueComment', 'closeIssue',
    'addLabels', 'removeLabel', 'addAssignees', 'removeAssignees',
    'getRepository', 'searchRepositories', 'searchCode',
  ],
  /**
   * **CI operations** — monitor and manage GitHub Actions workflows.
   *
   * Tools: `getRepository`, `listBranches`, `listCommits`, `getCommit`,
   * `listWorkflows`, `listWorkflowRuns`, `getWorkflowRun`, `listWorkflowJobs`, `listCheckRuns`, `getCombinedStatus`, `getCiFailureContext`,
   * `triggerWorkflow`, `cancelWorkflowRun`, `rerunWorkflowRun`.
   *
   * Agent prompt: optimized for diagnosing CI failures and managing workflow runs.
   */
  'ci-ops': [
    'getRepository', 'listBranches',
    'listCommits', 'getCommit',
    'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs', 'listCheckRuns', 'getCombinedStatus', 'getCiFailureContext',
    'triggerWorkflow', 'cancelWorkflowRun', 'rerunWorkflowRun',
  ],
  /**
   * **Repository explorer** — read-only access to browse codebases.
   *
   * Tools: all read-only tools including repos, branches, PRs, issues, commits, blame, comparisons,
   * search, gists, workflows, checks, and releases. No write operations.
   *
   * Agent prompt: optimized for answering questions about code structure and history.
   */
  'repo-explorer': [
    'getRepository', 'listBranches', 'getFileContent', 'getRepositoryTree',
    'listPullRequests', 'getPullRequest', 'listPullRequestFiles', 'listPullRequestReviews', 'getPullRequestContext',
    'listIssues', 'getIssue', 'getIssueContext',
    'listLabels',
    'listCommits', 'getCommit', 'getBlame', 'compareCommits',
    'searchCode', 'searchRepositories',
    'listGists', 'getGist', 'listGistComments',
    'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs', 'listCheckRuns', 'getCombinedStatus', 'getCiFailureContext',
    'listReleases', 'getLatestRelease', 'getRelease', 'getReleaseContext',
  ],
  /**
   * **Security audit** — review repositories for security risks and report findings.
   *
   * Tools: read-only exploration (`getFileContent`, `getRepositoryTree`, `searchCode`, `listCommits`, `getCommit`,
   * `getBlame`, `compareCommits`), PR and CI visibility (`listPullRequests`, `getPullRequest`, `listPullRequestFiles`,
   * `getPullRequestContext`, `listCheckRuns`, `getCombinedStatus`, `getCiFailureContext`, `listWorkflows`, `listWorkflowRuns`,
   * `getWorkflowRun`, `listWorkflowJobs`), plus `createIssue`, `addIssueComment`, and `addLabels` to report findings.
   * No destructive writes.
   *
   * Agent prompt: optimized for finding and reporting security risks without making changes.
   */
  'security-audit': [
    'getRepository', 'listBranches', 'getFileContent', 'getRepositoryTree',
    'listCommits', 'getCommit', 'getBlame', 'compareCommits',
    'searchCode', 'searchRepositories',
    'listPullRequests', 'getPullRequest', 'listPullRequestFiles', 'getPullRequestContext',
    'listCheckRuns', 'getCombinedStatus', 'getCiFailureContext',
    'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs',
    'listIssues', 'getIssue', 'getIssueContext', 'createIssue', 'addIssueComment', 'addLabels',
  ],
  /**
   * **Release manager** — prepare and publish GitHub releases.
   *
   * Tools: `getRepository`, `listBranches`, `listCommits`, `getCommit`, `compareCommits`,
   * `listReleases`, `getLatestRelease`, `getRelease`, `getReleaseContext`, `createRelease`,
   * `listWorkflows`, `listWorkflowRuns`, `getWorkflowRun`, `listWorkflowJobs`, `triggerWorkflow`,
   * `listPullRequests`, `getPullRequest`.
   *
   * Agent prompt: optimized for summarizing changes and cutting releases safely.
   */
  'release-manager': [
    'getRepository', 'listBranches', 'listCommits', 'getCommit', 'compareCommits',
    'listReleases', 'getLatestRelease', 'getRelease', 'getReleaseContext', 'createRelease',
    'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs', 'triggerWorkflow',
    'listPullRequests', 'getPullRequest',
  ],
  /**
   * **Maintainer** — full repository maintenance with all read and write tools.
   *
   * Tools: all tools (same as omitting `preset`).
   *
   * Agent prompt: optimized for day-to-day repo maintenance with careful write operations.
   */
  'maintainer': [
    'getRepository', 'listBranches', 'getFileContent', 'getRepositoryTree', 'createBranch', 'forkRepository', 'createRepository', 'createOrUpdateFile',
    'listPullRequests', 'getPullRequest', 'listPullRequestFiles', 'listPullRequestReviews', 'getPullRequestContext', 'createPullRequest', 'mergePullRequest', 'addPullRequestComment', 'createPullRequestReview', 'requestReviewers',
    'listIssues', 'getIssue', 'getIssueContext', 'createIssue', 'addIssueComment', 'closeIssue',
    'listLabels', 'addLabels', 'removeLabel', 'addAssignees', 'removeAssignees',
    'listCommits', 'getCommit', 'getBlame', 'compareCommits',
    'searchCode', 'searchRepositories',
    'listGists', 'getGist', 'listGistComments', 'createGist', 'updateGist', 'deleteGist', 'createGistComment',
    'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs', 'triggerWorkflow', 'cancelWorkflowRun', 'rerunWorkflowRun',
    'listCheckRuns', 'getCombinedStatus', 'getCiFailureContext',
    'listReleases', 'getLatestRelease', 'getRelease', 'getReleaseContext', 'createRelease',
  ],
} as const

export type GithubToolPreset = keyof typeof PRESET_TOOLS

/** Tool names included in a single preset. */
export type PresetToolName<P extends GithubToolPreset> = Extract<(typeof PRESET_TOOLS)[P][number], GithubToolName>

/** Tool names included when combining multiple presets. */
export type CombinedPresetToolNames<P extends readonly GithubToolPreset[]> = PresetToolName<P[number]>

/** Ensures every preset only references valid {@link GithubToolName} values at compile time. */
export type AssertValidPresetTools = {
  [K in GithubToolPreset]: PresetToolName<K> extends GithubToolName ? true : never
}

/**
 * Resolve a preset (or array of presets) into the set of tool names it includes.
 *
 * @param preset - A single preset or array of presets to combine.
 * @returns A `Set` of tool names, or `null` when `preset` is falsy.
 */
export function resolvePresetTools(preset: GithubToolPreset | GithubToolPreset[]): Set<GithubToolName> | null {
  if (!preset) return null
  const presets = Array.isArray(preset) ? preset : [preset]
  const tools = new Set<GithubToolName>()
  for (const p of presets) {
    for (const t of PRESET_TOOLS[p]) tools.add(t)
  }
  return tools
}
