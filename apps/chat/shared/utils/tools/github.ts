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
  createBranch: { title: 'Create Branch', label: 'Branch created', labelActive: 'Creating branch', icon: 'i-lucide-git-branch-plus' },
  forkRepository: { title: 'Fork Repository', label: 'Repository forked', labelActive: 'Forking repository', icon: 'i-lucide-git-fork' },
  createRepository: { title: 'Create Repository', label: 'Repository created', labelActive: 'Creating repository', icon: 'i-lucide-plus' },
  createOrUpdateFile: { title: 'Create / Update File', label: 'File updated', labelActive: 'Updating file', icon: 'i-lucide-file-pen' },
  listPullRequests: { title: 'List Pull Requests', label: 'Pull requests listed', labelActive: 'Listing pull requests', icon: 'i-lucide-git-pull-request' },
  getPullRequest: { title: 'Get Pull Request', label: 'Pull request fetched', labelActive: 'Fetching pull request', icon: 'i-lucide-git-pull-request' },
  createPullRequest: { title: 'Create Pull Request', label: 'Pull request created', labelActive: 'Creating pull request', icon: 'i-lucide-git-pull-request-arrow' },
  mergePullRequest: { title: 'Merge Pull Request', label: 'Pull request merged', labelActive: 'Merging pull request', icon: 'i-lucide-git-merge' },
  addPullRequestComment: { title: 'Comment on PR', label: 'Comment posted', labelActive: 'Posting PR comment', icon: 'i-lucide-message-square-plus' },
  listPullRequestFiles: { title: 'List PR Files', label: 'Files listed', labelActive: 'Listing PR files', icon: 'i-lucide-file-diff' },
  listPullRequestReviews: { title: 'List PR Reviews', label: 'Reviews listed', labelActive: 'Listing PR reviews', icon: 'i-lucide-message-circle' },
  createPullRequestReview: { title: 'Submit PR Review', label: 'Review submitted', labelActive: 'Submitting PR review', icon: 'i-lucide-shield-check' },
  listIssues: { title: 'List Issues', label: 'Issues listed', labelActive: 'Listing issues', icon: 'i-lucide-circle-dot' },
  getIssue: { title: 'Get Issue', label: 'Issue fetched', labelActive: 'Fetching issue', icon: 'i-lucide-circle-dot' },
  createIssue: { title: 'Create Issue', label: 'Issue created', labelActive: 'Creating issue', icon: 'i-lucide-circle-plus' },
  addIssueComment: { title: 'Comment on Issue', label: 'Comment posted', labelActive: 'Posting issue comment', icon: 'i-lucide-message-square-plus' },
  closeIssue: { title: 'Close Issue', label: 'Issue closed', labelActive: 'Closing issue', icon: 'i-lucide-circle-check' },
  listLabels: { title: 'List Labels', label: 'Labels listed', labelActive: 'Listing labels', icon: 'i-lucide-tags' },
  addLabels: { title: 'Add Labels', label: 'Labels added', labelActive: 'Adding labels', icon: 'i-lucide-tag' },
  removeLabel: { title: 'Remove Label', label: 'Label removed', labelActive: 'Removing label', icon: 'i-lucide-x' },
  searchCode: { title: 'Search Code', label: 'Code searched', labelActive: 'Searching code', icon: 'i-lucide-search-code' },
  searchRepositories: { title: 'Search Repositories', label: 'Repositories searched', labelActive: 'Searching repositories', icon: 'i-lucide-search' },
  listCommits: { title: 'List Commits', label: 'Commits listed', labelActive: 'Listing commits', icon: 'i-lucide-git-commit-horizontal' },
  getCommit: { title: 'Get Commit', label: 'Commit fetched', labelActive: 'Fetching commit', icon: 'i-lucide-git-commit-horizontal' },
  getBlame: { title: 'Git Blame', label: 'Blame loaded', labelActive: 'Loading blame', icon: 'i-lucide-scroll-text' },
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
  rerunWorkflowRun: { title: 'Re-run Workflow', label: 'Workflow re-run', labelActive: 'Re-running workflow', icon: 'i-lucide-refresh-cw' }
}

export const GITHUB_TOOL_NAMES = new Set<string>(Object.keys(GITHUB_TOOL_META))

export type GithubUIToolInvocation = UIToolInvocation<Tool> & {
  type: `tool-${GithubToolName}`
}
