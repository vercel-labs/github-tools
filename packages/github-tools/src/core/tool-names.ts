/**
 * All GitHub tool names available via {@link createGithubTools}.
 * Each key maps to its own string literal for IDE autocomplete and hover docs.
 */
export const GITHUB_TOOL_NAMES = {
  /** Get information about a GitHub repository including description, stars, forks, language, and default branch. */
  getRepository: 'getRepository',
  /** List branches in a GitHub repository. */
  listBranches: 'listBranches',
  /** Get the content of a file from a GitHub repository. Prefer startLine/endLine or maxLines for large files. */
  getFileContent: 'getFileContent',
  /** List the file and directory structure of a repository at a given ref. */
  getRepositoryTree: 'getRepositoryTree',
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
  /** Get detailed information about a specific pull request. Body truncated by default (detail: summary). */
  getPullRequest: 'getPullRequest',
  /** Create a new pull request in a GitHub repository. Requires approval by default. */
  createPullRequest: 'createPullRequest',
  /** Merge a pull request. Requires approval by default. */
  mergePullRequest: 'mergePullRequest',
  /** Update a pull request — title, body, state, base branch, or draft status. Requires approval by default. */
  updatePullRequest: 'updatePullRequest',
  /** Add a comment to a pull request. Requires approval by default. */
  addPullRequestComment: 'addPullRequestComment',
  /** Update the body of a comment on a pull request. Requires approval by default. */
  updatePullRequestComment: 'updatePullRequestComment',
  /** Delete a comment from a pull request permanently. Requires approval by default. */
  deletePullRequestComment: 'deletePullRequestComment',
  /** List files changed in a pull request with status and stats. Patches omitted by default — set includePatch true for diffs. */
  listPullRequestFiles: 'listPullRequestFiles',
  /** List reviews on a pull request (approvals, change requests, and comments). */
  listPullRequestReviews: 'listPullRequestReviews',
  /** Submit a pull request review — approve, request changes, or comment with optional inline comments on specific lines. Requires approval by default. */
  createPullRequestReview: 'createPullRequestReview',
  /** Request reviews from users or teams on a pull request. Requires approval by default. */
  requestReviewers: 'requestReviewers',
  /** Fetch pull request details plus files, reviews, and optional CI checks in one call. */
  getPullRequestContext: 'getPullRequestContext',
  /** List issues for a GitHub repository (excludes pull requests). */
  listIssues: 'listIssues',
  /** Get detailed information about a specific issue. Body truncated by default (detail: summary). */
  getIssue: 'getIssue',
  /** Fetch an issue plus available label names and recent comments in one call. */
  getIssueContext: 'getIssueContext',
  /** Create a new issue in a GitHub repository. Requires approval by default. */
  createIssue: 'createIssue',
  /** Add a comment to a GitHub issue. Requires approval by default. */
  addIssueComment: 'addIssueComment',
  /** Update the body of a comment on a GitHub issue. Requires approval by default. */
  updateIssueComment: 'updateIssueComment',
  /** Delete a comment from a GitHub issue permanently. Requires approval by default. */
  deleteIssueComment: 'deleteIssueComment',
  /** Close an open GitHub issue. Requires approval by default. */
  closeIssue: 'closeIssue',
  /** Update a GitHub issue — title, body, state, labels, milestone, or assignees. Requires approval by default. */
  updateIssue: 'updateIssue',
  /** List labels available in a GitHub repository. */
  listLabels: 'listLabels',
  /** Add labels to an issue or pull request. Requires approval by default. */
  addLabels: 'addLabels',
  /** Remove a label from an issue or pull request. Requires approval by default. */
  removeLabel: 'removeLabel',
  /** Create a label in a GitHub repository. Requires approval by default. */
  createLabel: 'createLabel',
  /** Update a label in a GitHub repository — name, color, or description. Requires approval by default. */
  updateLabel: 'updateLabel',
  /** Delete a label from a GitHub repository permanently. Requires approval by default. */
  deleteLabel: 'deleteLabel',
  /** Assign users to an issue or pull request. Requires approval by default. */
  addAssignees: 'addAssignees',
  /** Remove assignees from an issue or pull request. Requires approval by default. */
  removeAssignees: 'removeAssignees',
  /** Search for code in GitHub repositories. Use qualifiers like "repo:owner/name" to scope the search. Results include matching text snippets when GitHub returns them. */
  searchCode: 'searchCode',
  /** Search for GitHub repositories by keyword, topic, language, or other qualifiers. */
  searchRepositories: 'searchRepositories',
  /** Search for issues and pull requests across GitHub using search qualifiers like "repo:owner/name is:open". */
  searchIssues: 'searchIssues',
  /** List commits for a GitHub repository. Filter by file path to see commits that touched a file. For line-by-line attribution at a given ref, use getBlame instead. */
  listCommits: 'listCommits',
  /** Get detailed information about a specific commit, including the list of files changed. Patches omitted by default. */
  getCommit: 'getCommit',
  /** Line-level git blame for a file at a commit-like ref (branch, tag, or SHA). Returns contiguous ranges mapping lines to the commits that last modified them. */
  getBlame: 'getBlame',
  /** Compare two branches, tags, or commits — ahead/behind counts, commits in between, and differing files. Patches omitted by default. */
  compareCommits: 'compareCommits',
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
  /** List check runs (Checks API — GitHub Actions and other CI providers) for a commit, branch, or tag. */
  listCheckRuns: 'listCheckRuns',
  /** Get the combined commit status (Statuses API — legacy CI integrations) for a commit, branch, or tag. */
  getCombinedStatus: 'getCombinedStatus',
  /** Diagnose CI failures for a ref — combined status, failing checks, and failed workflow jobs in one call. */
  getCiFailureContext: 'getCiFailureContext',
  /** List discussions in a GitHub repository, most recently updated first, optionally filtered by category. */
  listDiscussions: 'listDiscussions',
  /** Get a GitHub discussion by number. Body truncated by default (detail: summary). */
  getDiscussion: 'getDiscussion',
  /** Add a comment to a GitHub discussion. Requires approval by default. */
  addDiscussionComment: 'addDiscussionComment',
  /** List notification threads for the authenticated user. Requires a token with notifications access. */
  listNotifications: 'listNotifications',
  /** Mark a single notification thread as read. Requires approval by default. */
  markNotificationRead: 'markNotificationRead',
  /** List reactions on an issue or pull request conversation, with per-emoji counts. */
  listIssueReactions: 'listIssueReactions',
  /** React to an issue or pull request with an emoji. Requires approval by default. */
  addIssueReaction: 'addIssueReaction',
  /** List reactions on an issue or pull request comment, with per-emoji counts. */
  listCommentReactions: 'listCommentReactions',
  /** React to an issue or pull request comment with an emoji. Requires approval by default. */
  addCommentReaction: 'addCommentReaction',
  /** List releases for a GitHub repository, newest first (includes drafts and prereleases). */
  listReleases: 'listReleases',
  /** Get the latest published release for a GitHub repository (excludes drafts and prereleases). Body truncated by default. */
  getLatestRelease: 'getLatestRelease',
  /** Get a specific release by ID, including its assets. Body truncated by default. */
  getRelease: 'getRelease',
  /** Fetch a release plus the previous release and tag comparison in one call. */
  getReleaseContext: 'getReleaseContext',
  /** Create a new release (and its tag if needed) in a GitHub repository. Requires approval by default. */
  createRelease: 'createRelease',
  /** Update an existing release — tag, target, title, notes, draft, or prerelease status. Requires approval by default. */
  updateRelease: 'updateRelease',
  /** Delete a release permanently. Requires approval by default. */
  deleteRelease: 'deleteRelease',
} as const

export type GithubToolName = typeof GITHUB_TOOL_NAMES[keyof typeof GITHUB_TOOL_NAMES]

export const ALL_GITHUB_TOOL_NAMES = Object.values(GITHUB_TOOL_NAMES) as GithubToolName[]
