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
   * Tools: `getPullRequest`, `listPullRequests`, `listPullRequestFiles`, `listPullRequestReviews`,
   * `getFileContent`, `listCommits`, `getCommit`, `getBlame`, `getRepository`, `listBranches`,
   * `searchCode`, `addPullRequestComment`, `createPullRequestReview`.
   *
   * Agent prompt: optimized for thorough PR review with inline feedback.
   */
  'code-review': [
    'getPullRequest', 'listPullRequests', 'listPullRequestFiles', 'listPullRequestReviews', 'getFileContent', 'listCommits', 'getCommit', 'getBlame',
    'getRepository', 'listBranches', 'searchCode',
    'addPullRequestComment', 'createPullRequestReview',
  ],
  /**
   * **Issue triage** — manage and organize GitHub issues.
   *
   * Tools: `listIssues`, `getIssue`, `createIssue`, `addIssueComment`, `closeIssue`,
   * `listLabels`, `addLabels`, `removeLabel`, `getRepository`, `searchRepositories`, `searchCode`.
   *
   * Agent prompt: optimized for categorizing, labeling, and responding to issues.
   */
  'issue-triage': [
    'listIssues', 'getIssue', 'createIssue', 'addIssueComment', 'closeIssue',
    'listLabels', 'addLabels', 'removeLabel',
    'getRepository', 'searchRepositories', 'searchCode',
  ],
  /**
   * **CI operations** — monitor and manage GitHub Actions workflows.
   *
   * Tools: `getRepository`, `listBranches`, `listCommits`, `getCommit`,
   * `listWorkflows`, `listWorkflowRuns`, `getWorkflowRun`, `listWorkflowJobs`,
   * `triggerWorkflow`, `cancelWorkflowRun`, `rerunWorkflowRun`.
   *
   * Agent prompt: optimized for diagnosing CI failures and managing workflow runs.
   */
  'ci-ops': [
    'getRepository', 'listBranches',
    'listCommits', 'getCommit',
    'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs',
    'triggerWorkflow', 'cancelWorkflowRun', 'rerunWorkflowRun',
  ],
  /**
   * **Repository explorer** — read-only access to browse codebases.
   *
   * Tools: all read-only tools including repos, branches, PRs, issues, commits, blame,
   * search, gists, and workflows. No write operations.
   *
   * Agent prompt: optimized for answering questions about code structure and history.
   */
  'repo-explorer': [
    'getRepository', 'listBranches', 'getFileContent',
    'listPullRequests', 'getPullRequest', 'listPullRequestFiles', 'listPullRequestReviews',
    'listIssues', 'getIssue',
    'listLabels',
    'listCommits', 'getCommit', 'getBlame',
    'searchCode', 'searchRepositories',
    'listGists', 'getGist', 'listGistComments',
    'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs',
  ],
  /**
   * **Maintainer** — full repository maintenance with all read and write tools.
   *
   * Tools: all 42 tools (same as omitting `preset`).
   *
   * Agent prompt: optimized for day-to-day repo maintenance with careful write operations.
   */
  'maintainer': [
    'getRepository', 'listBranches', 'getFileContent', 'createBranch', 'forkRepository', 'createRepository', 'createOrUpdateFile',
    'listPullRequests', 'getPullRequest', 'listPullRequestFiles', 'listPullRequestReviews', 'createPullRequest', 'mergePullRequest', 'addPullRequestComment', 'createPullRequestReview',
    'listIssues', 'getIssue', 'createIssue', 'addIssueComment', 'closeIssue',
    'listLabels', 'addLabels', 'removeLabel',
    'listCommits', 'getCommit', 'getBlame',
    'searchCode', 'searchRepositories',
    'listGists', 'getGist', 'listGistComments', 'createGist', 'updateGist', 'deleteGist', 'createGistComment',
    'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs', 'triggerWorkflow', 'cancelWorkflowRun', 'rerunWorkflowRun',
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
