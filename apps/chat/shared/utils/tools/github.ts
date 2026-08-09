import type { UIToolInvocation, Tool } from 'ai'
import type { GithubTools } from '@github-tools/sdk'

export type GithubToolName = keyof GithubTools

export type GithubToolMeta = {
  title: string // card header: "Create Issue"
  label: string // done: "Issue created"
  labelActive: string // running: "Creating issue"
  icon: string
}

export const GITHUB_TOOL_META: Record<GithubToolName, GithubToolMeta> = {
  getRepository: { title: 'Get Repository', label: 'Repository fetched', labelActive: 'Fetching repository', icon: 'i-simple-icons-github' },
  listBranches: { title: 'List Branches', label: 'Branches listed', labelActive: 'Listing branches', icon: 'i-lucide-git-branch' },
  getFileContent: { title: 'Get File Content', label: 'File read', labelActive: 'Reading file', icon: 'i-lucide-file-code' },
  getRepositoryTree: { title: 'Get Repository Tree', label: 'Tree fetched', labelActive: 'Fetching repository tree', icon: 'i-lucide-folder-tree' },
  createBranch: { title: 'Create Branch', label: 'Branch created', labelActive: 'Creating branch', icon: 'i-lucide-git-branch-plus' },
  forkRepository: { title: 'Fork Repository', label: 'Repository forked', labelActive: 'Forking repository', icon: 'i-lucide-git-fork' },
  createRepository: { title: 'Create Repository', label: 'Repository created', labelActive: 'Creating repository', icon: 'i-lucide-plus' },
  createOrUpdateFile: { title: 'Create / Update File', label: 'File updated', labelActive: 'Updating file', icon: 'i-lucide-file-pen' },
  listPullRequests: { title: 'List Pull Requests', label: 'Pull requests listed', labelActive: 'Listing pull requests', icon: 'i-lucide-git-pull-request' },
  getPullRequest: { title: 'Get Pull Request', label: 'Pull request fetched', labelActive: 'Fetching pull request', icon: 'i-lucide-git-pull-request' },
  createPullRequest: { title: 'Create Pull Request', label: 'Pull request created', labelActive: 'Creating pull request', icon: 'i-lucide-git-pull-request-arrow' },
  mergePullRequest: { title: 'Merge Pull Request', label: 'Pull request merged', labelActive: 'Merging pull request', icon: 'i-lucide-git-merge' },
  updatePullRequest: { title: 'Update Pull Request', label: 'Pull request updated', labelActive: 'Updating pull request', icon: 'i-lucide-git-pull-request-arrow' },
  addPullRequestComment: { title: 'Comment on PR', label: 'Comment posted', labelActive: 'Posting PR comment', icon: 'i-lucide-message-square-plus' },
  updatePullRequestComment: { title: 'Update PR Comment', label: 'Comment updated', labelActive: 'Updating PR comment', icon: 'i-lucide-message-square-text' },
  deletePullRequestComment: { title: 'Delete PR Comment', label: 'Comment deleted', labelActive: 'Deleting PR comment', icon: 'i-lucide-message-square-x' },
  listPullRequestFiles: { title: 'List PR Files', label: 'Files listed', labelActive: 'Listing PR files', icon: 'i-lucide-file-diff' },
  listPullRequestReviews: { title: 'List PR Reviews', label: 'Reviews listed', labelActive: 'Listing PR reviews', icon: 'i-lucide-message-circle' },
  createPullRequestReview: { title: 'Submit PR Review', label: 'Review submitted', labelActive: 'Submitting PR review', icon: 'i-lucide-shield-check' },
  requestReviewers: { title: 'Request Reviewers', label: 'Reviewers requested', labelActive: 'Requesting reviewers', icon: 'i-lucide-user-plus' },
  getPullRequestContext: { title: 'PR Context', label: 'PR context loaded', labelActive: 'Loading PR context', icon: 'i-lucide-layers' },
  listIssues: { title: 'List Issues', label: 'Issues listed', labelActive: 'Listing issues', icon: 'i-lucide-circle-dot' },
  getIssue: { title: 'Get Issue', label: 'Issue fetched', labelActive: 'Fetching issue', icon: 'i-lucide-circle-dot' },
  getIssueContext: { title: 'Issue Context', label: 'Issue context loaded', labelActive: 'Loading issue context', icon: 'i-lucide-layers' },
  createIssue: { title: 'Create Issue', label: 'Issue created', labelActive: 'Creating issue', icon: 'i-lucide-circle-plus' },
  addIssueComment: { title: 'Comment on Issue', label: 'Comment posted', labelActive: 'Posting issue comment', icon: 'i-lucide-message-square-plus' },
  updateIssueComment: { title: 'Update Issue Comment', label: 'Comment updated', labelActive: 'Updating issue comment', icon: 'i-lucide-message-square-text' },
  deleteIssueComment: { title: 'Delete Issue Comment', label: 'Comment deleted', labelActive: 'Deleting issue comment', icon: 'i-lucide-message-square-x' },
  closeIssue: { title: 'Close Issue', label: 'Issue closed', labelActive: 'Closing issue', icon: 'i-lucide-circle-check' },
  updateIssue: { title: 'Update Issue', label: 'Issue updated', labelActive: 'Updating issue', icon: 'i-lucide-circle-dot' },
  listLabels: { title: 'List Labels', label: 'Labels listed', labelActive: 'Listing labels', icon: 'i-lucide-tags' },
  addLabels: { title: 'Add Labels', label: 'Labels added', labelActive: 'Adding labels', icon: 'i-lucide-tag' },
  removeLabel: { title: 'Remove Label', label: 'Label removed', labelActive: 'Removing label', icon: 'i-lucide-x' },
  createLabel: { title: 'Create Label', label: 'Label created', labelActive: 'Creating label', icon: 'i-lucide-plus' },
  updateLabel: { title: 'Update Label', label: 'Label updated', labelActive: 'Updating label', icon: 'i-lucide-pencil' },
  deleteLabel: { title: 'Delete Label', label: 'Label deleted', labelActive: 'Deleting label', icon: 'i-lucide-trash-2' },
  addAssignees: { title: 'Add Assignees', label: 'Assignees added', labelActive: 'Adding assignees', icon: 'i-lucide-user-plus' },
  removeAssignees: { title: 'Remove Assignees', label: 'Assignees removed', labelActive: 'Removing assignees', icon: 'i-lucide-user-minus' },
  listIssueReactions: { title: 'List Issue Reactions', label: 'Reactions listed', labelActive: 'Listing reactions', icon: 'i-lucide-smile' },
  addIssueReaction: { title: 'React to Issue', label: 'Reaction added', labelActive: 'Adding reaction', icon: 'i-lucide-smile-plus' },
  listCommentReactions: { title: 'List Comment Reactions', label: 'Reactions listed', labelActive: 'Listing comment reactions', icon: 'i-lucide-smile' },
  addCommentReaction: { title: 'React to Comment', label: 'Reaction added', labelActive: 'Adding comment reaction', icon: 'i-lucide-smile-plus' },
  listDiscussions: { title: 'List Discussions', label: 'Discussions listed', labelActive: 'Listing discussions', icon: 'i-lucide-messages-square' },
  getDiscussion: { title: 'Get Discussion', label: 'Discussion fetched', labelActive: 'Fetching discussion', icon: 'i-lucide-messages-square' },
  addDiscussionComment: { title: 'Comment on Discussion', label: 'Comment posted', labelActive: 'Posting discussion comment', icon: 'i-lucide-message-square-plus' },
  listNotifications: { title: 'List Notifications', label: 'Notifications listed', labelActive: 'Listing notifications', icon: 'i-lucide-bell' },
  markNotificationRead: { title: 'Mark Notification Read', label: 'Notification marked read', labelActive: 'Marking notification read', icon: 'i-lucide-bell-off' },
  searchCode: { title: 'Search Code', label: 'Code searched', labelActive: 'Searching code', icon: 'i-lucide-search-code' },
  searchRepositories: { title: 'Search Repositories', label: 'Repositories searched', labelActive: 'Searching repositories', icon: 'i-lucide-search' },
  searchIssues: { title: 'Search Issues', label: 'Issues searched', labelActive: 'Searching issues', icon: 'i-lucide-search' },
  listCommits: { title: 'List Commits', label: 'Commits listed', labelActive: 'Listing commits', icon: 'i-lucide-git-commit-horizontal' },
  getCommit: { title: 'Get Commit', label: 'Commit fetched', labelActive: 'Fetching commit', icon: 'i-lucide-git-commit-horizontal' },
  getBlame: { title: 'Git Blame', label: 'Blame loaded', labelActive: 'Loading blame', icon: 'i-lucide-scroll-text' },
  compareCommits: { title: 'Compare Commits', label: 'Comparison loaded', labelActive: 'Comparing commits', icon: 'i-lucide-git-compare' },
  listGists: { title: 'List Gists', label: 'Gists listed', labelActive: 'Listing gists', icon: 'i-lucide-file-code-2' },
  getGist: { title: 'Get Gist', label: 'Gist fetched', labelActive: 'Fetching gist', icon: 'i-lucide-file-code-2' },
  listGistComments: { title: 'List Gist Comments', label: 'Comments listed', labelActive: 'Listing gist comments', icon: 'i-lucide-message-square' },
  createGist: { title: 'Create Gist', label: 'Gist created', labelActive: 'Creating gist', icon: 'i-lucide-file-plus' },
  updateGist: { title: 'Update Gist', label: 'Gist updated', labelActive: 'Updating gist', icon: 'i-lucide-file-pen' },
  deleteGist: { title: 'Delete Gist', label: 'Gist deleted', labelActive: 'Deleting gist', icon: 'i-lucide-file-x' },
  createGistComment: { title: 'Comment on Gist', label: 'Comment posted', labelActive: 'Posting gist comment', icon: 'i-lucide-message-square-plus' },
  listWorkflows: { title: 'List Workflows', label: 'Workflows listed', labelActive: 'Listing workflows', icon: 'i-lucide-workflow' },
  listWorkflowRuns: { title: 'List Workflow Runs', label: 'Runs listed', labelActive: 'Listing workflow runs', icon: 'i-lucide-play' },
  getWorkflowRun: { title: 'Get Workflow Run', label: 'Run fetched', labelActive: 'Fetching workflow run', icon: 'i-lucide-play' },
  listWorkflowJobs: { title: 'List Workflow Jobs', label: 'Jobs listed', labelActive: 'Listing workflow jobs', icon: 'i-lucide-list-checks' },
  triggerWorkflow: { title: 'Trigger Workflow', label: 'Workflow triggered', labelActive: 'Triggering workflow', icon: 'i-lucide-rocket' },
  cancelWorkflowRun: { title: 'Cancel Workflow Run', label: 'Run cancelled', labelActive: 'Cancelling workflow run', icon: 'i-lucide-circle-x' },
  rerunWorkflowRun: { title: 'Re-run Workflow', label: 'Workflow re-run', labelActive: 'Re-running workflow', icon: 'i-lucide-refresh-cw' },
  listCheckRuns: { title: 'List Check Runs', label: 'Check runs listed', labelActive: 'Listing check runs', icon: 'i-lucide-list-checks' },
  getCombinedStatus: { title: 'Get Combined Status', label: 'Status fetched', labelActive: 'Fetching combined status', icon: 'i-lucide-activity' },
  getCiFailureContext: { title: 'CI Failure Context', label: 'CI failures loaded', labelActive: 'Diagnosing CI failures', icon: 'i-lucide-triangle-alert' },
  listReleases: { title: 'List Releases', label: 'Releases listed', labelActive: 'Listing releases', icon: 'i-lucide-tag' },
  getLatestRelease: { title: 'Get Latest Release', label: 'Latest release fetched', labelActive: 'Fetching latest release', icon: 'i-lucide-tag' },
  getRelease: { title: 'Get Release', label: 'Release fetched', labelActive: 'Fetching release', icon: 'i-lucide-tag' },
  getReleaseContext: { title: 'Release Context', label: 'Release context loaded', labelActive: 'Loading release context', icon: 'i-lucide-layers' },
  createRelease: { title: 'Create Release', label: 'Release created', labelActive: 'Creating release', icon: 'i-lucide-rocket' },
  updateRelease: { title: 'Update Release', label: 'Release updated', labelActive: 'Updating release', icon: 'i-lucide-tag' },
  deleteRelease: { title: 'Delete Release', label: 'Release deleted', labelActive: 'Deleting release', icon: 'i-lucide-trash-2' }
}

export const GITHUB_TOOL_NAMES = new Set<string>(Object.keys(GITHUB_TOOL_META))

export type GithubUIToolInvocation = UIToolInvocation<Tool> & {
  type: `tool-${GithubToolName}`
}
