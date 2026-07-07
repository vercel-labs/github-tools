/**
 * All GitHub tool names available via {@link createGithubTools}.
 * Each key maps to its own string literal for IDE autocomplete and hover docs.
 */
export const GITHUB_TOOL_NAMES = {
  /** Get information about a GitHub repository including description, stars, forks, language, and default branch. */
  getRepository: 'getRepository',
  /** List branches in a GitHub repository. */
  listBranches: 'listBranches',
  /** Get the content of a file from a GitHub repository. */
  getFileContent: 'getFileContent',
  /** Create a new branch in a GitHub repository from an existing branch or commit SHA. Requires approval by default. */
  createBranch: 'createBranch',
  /** Fork a GitHub repository to the authenticated user account or a specified organization. Requires approval by default. */
  forkRepository: 'forkRepository',
  /** Create a new GitHub repository for the authenticated user or a specified organization. Requires approval by default. */
  createRepository: 'createRepository',
  /** Create or update a file in a GitHub repository. Provide the SHA when updating an existing file. Requires approval by default. */
  createOrUpdateFile: 'createOrUpdateFile',
  /** List pull requests for a GitHub repository. */
  listPullRequests: 'listPullRequests',
  /** Get detailed information about a specific pull request. */
  getPullRequest: 'getPullRequest',
  /** Create a new pull request in a GitHub repository. Requires approval by default. */
  createPullRequest: 'createPullRequest',
  /** Merge a pull request. Requires approval by default. */
  mergePullRequest: 'mergePullRequest',
  /** Add a comment to a pull request. Requires approval by default. */
  addPullRequestComment: 'addPullRequestComment',
  /** List files changed in a pull request, including diff status and patch content. */
  listPullRequestFiles: 'listPullRequestFiles',
  /** List reviews on a pull request (approvals, change requests, and comments). */
  listPullRequestReviews: 'listPullRequestReviews',
  /** Submit a pull request review — approve, request changes, or comment with optional inline comments on specific lines. Requires approval by default. */
  createPullRequestReview: 'createPullRequestReview',
  /** List issues for a GitHub repository (excludes pull requests). */
  listIssues: 'listIssues',
  /** Get detailed information about a specific issue. */
  getIssue: 'getIssue',
  /** Create a new issue in a GitHub repository. Requires approval by default. */
  createIssue: 'createIssue',
  /** Add a comment to a GitHub issue. Requires approval by default. */
  addIssueComment: 'addIssueComment',
  /** Close an open GitHub issue. Requires approval by default. */
  closeIssue: 'closeIssue',
  /** List labels available in a GitHub repository. */
  listLabels: 'listLabels',
  /** Add labels to an issue or pull request. Requires approval by default. */
  addLabels: 'addLabels',
  /** Remove a label from an issue or pull request. Requires approval by default. */
  removeLabel: 'removeLabel',
  /** Search for code in GitHub repositories. Use qualifiers like "repo:owner/name" to scope the search. */
  searchCode: 'searchCode',
  /** Search for GitHub repositories by keyword, topic, language, or other qualifiers. */
  searchRepositories: 'searchRepositories',
  /** List commits for a GitHub repository. Filter by file path to see commits that touched a file. For line-by-line attribution at a given ref, use getBlame instead. */
  listCommits: 'listCommits',
  /** Get detailed information about a specific commit, including the list of files changed with additions and deletions. */
  getCommit: 'getCommit',
  /** Line-level git blame for a file at a commit-like ref (branch, tag, or SHA). Returns contiguous ranges mapping lines to the commits that last modified them. */
  getBlame: 'getBlame',
  /** List gists for the authenticated user or a specific user. */
  listGists: 'listGists',
  /** Get a gist by ID, including file contents. */
  getGist: 'getGist',
  /** List comments on a gist. */
  listGistComments: 'listGistComments',
  /** Create a new gist with one or more files. Requires approval by default. */
  createGist: 'createGist',
  /** Update an existing gist — edit description, update files, or remove files. Requires approval by default. */
  updateGist: 'updateGist',
  /** Delete a gist permanently. Requires approval by default. */
  deleteGist: 'deleteGist',
  /** Add a comment to a gist. Requires approval by default. */
  createGistComment: 'createGistComment',
  /** List GitHub Actions workflows in a repository. */
  listWorkflows: 'listWorkflows',
  /** List workflow runs for a repository, optionally filtered by workflow, branch, status, or event. */
  listWorkflowRuns: 'listWorkflowRuns',
  /** Get details of a specific workflow run including status, timing, and trigger info. */
  getWorkflowRun: 'getWorkflowRun',
  /** List jobs for a workflow run, including step-level status and timing. */
  listWorkflowJobs: 'listWorkflowJobs',
  /** Trigger a workflow via workflow_dispatch event. Requires approval by default. */
  triggerWorkflow: 'triggerWorkflow',
  /** Cancel an in-progress workflow run. Requires approval by default. */
  cancelWorkflowRun: 'cancelWorkflowRun',
  /** Re-run a workflow run, optionally only the failed jobs. Requires approval by default. */
  rerunWorkflowRun: 'rerunWorkflowRun',
} as const

export type GithubToolName = typeof GITHUB_TOOL_NAMES[keyof typeof GITHUB_TOOL_NAMES]

export const ALL_GITHUB_TOOL_NAMES = Object.values(GITHUB_TOOL_NAMES) as GithubToolName[]
