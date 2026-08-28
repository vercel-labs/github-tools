/**
 * Write tools that mutate GitHub state. All require user approval by default
 * unless overridden via {@link ApprovalConfig}.
 */
export const GITHUB_WRITE_TOOLS = {
  /** Create a new branch in a GitHub repository from an existing branch or commit SHA. Requires approval by default. */
  createBranch: 'createBranch',
  /** Delete a branch from a GitHub repository permanently. Requires approval by default. */
  deleteBranch: 'deleteBranch',
  /** Fork a GitHub repository to the authenticated user account or a specified organization. Requires approval by default. */
  forkRepository: 'forkRepository',
  /** Create a new GitHub repository for the authenticated user or a specified organization. Requires approval by default. */
  createRepository: 'createRepository',
  /** Create or update a file in a GitHub repository. Requires approval by default. */
  createOrUpdateFile: 'createOrUpdateFile',
  /** Create a new pull request in a GitHub repository. Requires approval by default. */
  createPullRequest: 'createPullRequest',
  /** Merge a pull request. Requires approval by default. */
  mergePullRequest: 'mergePullRequest',
  /** Update a pull request. Requires approval by default. */
  updatePullRequest: 'updatePullRequest',
  /** Add a comment to a pull request. Requires approval by default. */
  addPullRequestComment: 'addPullRequestComment',
  /** Update a pull request comment. Requires approval by default. */
  updatePullRequestComment: 'updatePullRequestComment',
  /** Delete a pull request comment. Requires approval by default. */
  deletePullRequestComment: 'deletePullRequestComment',
  /** Submit a pull request review with optional inline comments. Requires approval by default. */
  createPullRequestReview: 'createPullRequestReview',
  /** Reply to a pull request review comment in its review thread. Requires approval by default. */
  replyToReviewComment: 'replyToReviewComment',
  /** Mark a pull request review thread as resolved. Requires approval by default. */
  resolveReviewThread: 'resolveReviewThread',
  /** Request reviews from users or teams on a pull request. Requires approval by default. */
  requestReviewers: 'requestReviewers',
  /** Create a new issue in a GitHub repository. Requires approval by default. */
  createIssue: 'createIssue',
  /** Add a comment to a GitHub issue. Requires approval by default. */
  addIssueComment: 'addIssueComment',
  /** Update a GitHub issue comment. Requires approval by default. */
  updateIssueComment: 'updateIssueComment',
  /** Delete a GitHub issue comment. Requires approval by default. */
  deleteIssueComment: 'deleteIssueComment',
  /** Close an open GitHub issue. Requires approval by default. */
  closeIssue: 'closeIssue',
  /** Update a GitHub issue. Requires approval by default. */
  updateIssue: 'updateIssue',
  /** Add labels to an issue or pull request. Requires approval by default. */
  addLabels: 'addLabels',
  /** Remove a label from an issue or pull request. Requires approval by default. */
  removeLabel: 'removeLabel',
  /** Create a label in a GitHub repository. Requires approval by default. */
  createLabel: 'createLabel',
  /** Update a label in a GitHub repository. Requires approval by default. */
  updateLabel: 'updateLabel',
  /** Delete a label from a GitHub repository permanently. Requires approval by default. */
  deleteLabel: 'deleteLabel',
  /** Assign users to an issue or pull request. Requires approval by default. */
  addAssignees: 'addAssignees',
  /** Remove assignees from an issue or pull request. Requires approval by default. */
  removeAssignees: 'removeAssignees',
  /** Create a new gist with one or more files. Requires approval by default. */
  createGist: 'createGist',
  /** Update an existing gist. Requires approval by default. */
  updateGist: 'updateGist',
  /** Delete a gist permanently. Requires approval by default. */
  deleteGist: 'deleteGist',
  /** Add a comment to a gist. Requires approval by default. */
  createGistComment: 'createGistComment',
  /** Add a comment to a GitHub discussion. Requires approval by default. */
  addDiscussionComment: 'addDiscussionComment',
  /** Mark a single notification thread as read. Requires approval by default. */
  markNotificationRead: 'markNotificationRead',
  /** React to an issue or pull request with an emoji. Requires approval by default. */
  addIssueReaction: 'addIssueReaction',
  /** React to an issue or pull request comment with an emoji. Requires approval by default. */
  addCommentReaction: 'addCommentReaction',
  /** Trigger a workflow via workflow_dispatch event. Requires approval by default. */
  triggerWorkflow: 'triggerWorkflow',
  /** Cancel an in-progress workflow run. Requires approval by default. */
  cancelWorkflowRun: 'cancelWorkflowRun',
  /** Re-run a workflow run, optionally only the failed jobs. Requires approval by default. */
  rerunWorkflowRun: 'rerunWorkflowRun',
  /** Create a new release (and its tag if needed) in a GitHub repository. Requires approval by default. */
  createRelease: 'createRelease',
  /** Update an existing release. Requires approval by default. */
  updateRelease: 'updateRelease',
  /** Delete a release permanently. Requires approval by default. */
  deleteRelease: 'deleteRelease',
} as const

export type GithubWriteToolName = typeof GITHUB_WRITE_TOOLS[keyof typeof GITHUB_WRITE_TOOLS]

export const GITHUB_WRITE_TOOL_NAMES = Object.values(GITHUB_WRITE_TOOLS) as GithubWriteToolName[]
