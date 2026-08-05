/**
 * Static mirror of `packages/github-tools/src/core/{presets,tool-names,write-tools}.ts`.
 * Kept in the docs app (rather than importing `@github-tools/sdk`) to avoid pulling the
 * SDK into the client bundle. Update alongside those files when tools or presets change.
 */

export interface ToolInfo {
  name: string
  domain: string
  capability: string
  write: boolean
}

export interface PresetInfo {
  id: string
  label: string
  useCase: string
  tools: string[]
}

export const TOOL_CATALOG: ToolInfo[] = [
  { name: 'getRepository', domain: 'Repository', capability: 'Get repository metadata (stars, language, default branch, …)', write: false },
  { name: 'listBranches', domain: 'Repository', capability: 'List branches in a repository', write: false },
  { name: 'getFileContent', domain: 'Repository', capability: 'Read a file\u2019s content at a given ref', write: false },
  { name: 'getRepositoryTree', domain: 'Repository', capability: 'List the file and directory structure at a given ref', write: false },
  { name: 'createBranch', domain: 'Repository', capability: 'Create a new branch from a branch or commit SHA', write: true },
  { name: 'forkRepository', domain: 'Repository', capability: 'Fork a repository to a user or organization', write: true },
  { name: 'createRepository', domain: 'Repository', capability: 'Create a new repository', write: true },
  { name: 'createOrUpdateFile', domain: 'Repository', capability: 'Create or update a file and commit it', write: true },

  { name: 'listPullRequests', domain: 'Pull requests', capability: 'List pull requests filtered by state', write: false },
  { name: 'getPullRequest', domain: 'Pull requests', capability: 'Get PR details including diff stats', write: false },
  { name: 'listPullRequestFiles', domain: 'Pull requests', capability: 'List files changed in a PR with patches', write: false },
  { name: 'listPullRequestReviews', domain: 'Pull requests', capability: 'List reviews on a PR', write: false },
  { name: 'createPullRequest', domain: 'Pull requests', capability: 'Open a new pull request', write: true },
  { name: 'mergePullRequest', domain: 'Pull requests', capability: 'Merge a pull request', write: true },
  { name: 'addPullRequestComment', domain: 'Pull requests', capability: 'Post a comment on a PR', write: true },
  { name: 'createPullRequestReview', domain: 'Pull requests', capability: 'Submit a formal review with inline comments', write: true },
  { name: 'requestReviewers', domain: 'Pull requests', capability: 'Request reviews from users or teams', write: true },

  { name: 'listIssues', domain: 'Issues', capability: 'List issues filtered by state and labels', write: false },
  { name: 'getIssue', domain: 'Issues', capability: 'Get issue details and comments', write: false },
  { name: 'createIssue', domain: 'Issues', capability: 'Create a new issue', write: true },
  { name: 'addIssueComment', domain: 'Issues', capability: 'Post a comment on an issue', write: true },
  { name: 'closeIssue', domain: 'Issues', capability: 'Close an issue', write: true },
  { name: 'listLabels', domain: 'Issues', capability: 'List labels available in a repository', write: false },
  { name: 'addLabels', domain: 'Issues', capability: 'Add labels to an issue or PR', write: true },
  { name: 'removeLabel', domain: 'Issues', capability: 'Remove a label from an issue or PR', write: true },
  { name: 'addAssignees', domain: 'Issues', capability: 'Assign users to an issue or PR', write: true },
  { name: 'removeAssignees', domain: 'Issues', capability: 'Remove assignees from an issue or PR', write: true },

  { name: 'listGists', domain: 'Gists', capability: 'List gists for a user', write: false },
  { name: 'getGist', domain: 'Gists', capability: 'Get a gist including file contents', write: false },
  { name: 'listGistComments', domain: 'Gists', capability: 'List comments on a gist', write: false },
  { name: 'createGist', domain: 'Gists', capability: 'Create a new gist with one or more files', write: true },
  { name: 'updateGist', domain: 'Gists', capability: 'Update a gist\u2019s description or files', write: true },
  { name: 'deleteGist', domain: 'Gists', capability: 'Delete a gist permanently', write: true },
  { name: 'createGistComment', domain: 'Gists', capability: 'Post a comment on a gist', write: true },

  { name: 'listWorkflows', domain: 'Workflows', capability: 'List GitHub Actions workflows in a repository', write: false },
  { name: 'listWorkflowRuns', domain: 'Workflows', capability: 'List workflow runs filtered by workflow, branch, status, or event', write: false },
  { name: 'getWorkflowRun', domain: 'Workflows', capability: 'Get a workflow run\u2019s status, timing, and trigger info', write: false },
  { name: 'listWorkflowJobs', domain: 'Workflows', capability: 'List jobs in a workflow run with step-level status', write: false },
  { name: 'triggerWorkflow', domain: 'Workflows', capability: 'Trigger a workflow via workflow_dispatch event', write: true },
  { name: 'cancelWorkflowRun', domain: 'Workflows', capability: 'Cancel an in-progress workflow run', write: true },
  { name: 'rerunWorkflowRun', domain: 'Workflows', capability: 'Re-run a workflow run, optionally only failed jobs', write: true },

  { name: 'listCheckRuns', domain: 'Checks & statuses', capability: 'List check runs (Checks API) for a commit, branch, or tag', write: false },
  { name: 'getCombinedStatus', domain: 'Checks & statuses', capability: 'Get the combined commit status (Statuses API) for a commit, branch, or tag', write: false },

  { name: 'listReleases', domain: 'Releases', capability: 'List releases, newest first (includes drafts and prereleases)', write: false },
  { name: 'getLatestRelease', domain: 'Releases', capability: 'Get the latest published release', write: false },
  { name: 'getRelease', domain: 'Releases', capability: 'Get a specific release by ID, including its assets', write: false },
  { name: 'createRelease', domain: 'Releases', capability: 'Create a new release (and its tag if needed)', write: true },

  { name: 'listCommits', domain: 'Commits & search', capability: 'List commits, optionally filtered by file path, author, or date range', write: false },
  { name: 'getCommit', domain: 'Commits & search', capability: 'Get a commit\u2019s full details including changed files and diffs', write: false },
  { name: 'getBlame', domain: 'Commits & search', capability: 'Line-level git blame for a file (GraphQL)', write: false },
  { name: 'compareCommits', domain: 'Commits & search', capability: 'Compare two branches, tags, or commits', write: false },
  { name: 'searchCode', domain: 'Commits & search', capability: 'Search code across GitHub with qualifier support', write: false },
  { name: 'searchRepositories', domain: 'Commits & search', capability: 'Search repositories by keyword, topic, language, stars, …', write: false },
]

export const TOOL_DOMAINS = [
  'Repository', 'Pull requests', 'Issues', 'Gists', 'Workflows', 'Checks & statuses', 'Releases', 'Commits & search',
]

const toolsByName = new Map(TOOL_CATALOG.map(tool => [tool.name, tool]))

export function getTool(name: string): ToolInfo {
  const tool = toolsByName.get(name)
  if (!tool) throw new Error(`Unknown tool in preset-explorer-data: ${name}`)
  return tool
}

export const PRESETS: PresetInfo[] = [
  {
    id: 'code-review',
    label: 'code-review',
    useCase: 'PR copilots, change summaries',
    tools: [
      'getPullRequest', 'listPullRequests', 'listPullRequestFiles', 'listPullRequestReviews', 'getFileContent', 'listCommits', 'getCommit', 'getBlame', 'compareCommits',
      'getRepository', 'listBranches', 'searchCode', 'listCheckRuns', 'getCombinedStatus',
      'addPullRequestComment', 'createPullRequestReview', 'requestReviewers',
    ],
  },
  {
    id: 'issue-triage',
    label: 'issue-triage',
    useCase: 'Support triage, backlog bots',
    tools: [
      'listIssues', 'getIssue', 'createIssue', 'addIssueComment', 'closeIssue',
      'listLabels', 'addLabels', 'removeLabel', 'addAssignees', 'removeAssignees',
      'getRepository', 'searchRepositories', 'searchCode',
    ],
  },
  {
    id: 'ci-ops',
    label: 'ci-ops',
    useCase: 'CI monitoring, build ops',
    tools: [
      'getRepository', 'listBranches',
      'listCommits', 'getCommit',
      'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs', 'listCheckRuns', 'getCombinedStatus',
      'triggerWorkflow', 'cancelWorkflowRun', 'rerunWorkflowRun',
    ],
  },
  {
    id: 'repo-explorer',
    label: 'repo-explorer',
    useCase: 'Knowledge retrieval, repo Q&A',
    tools: [
      'getRepository', 'listBranches', 'getFileContent', 'getRepositoryTree',
      'listPullRequests', 'getPullRequest', 'listPullRequestFiles', 'listPullRequestReviews',
      'listIssues', 'getIssue',
      'listLabels',
      'listCommits', 'getCommit', 'getBlame', 'compareCommits',
      'searchCode', 'searchRepositories',
      'listGists', 'getGist', 'listGistComments',
      'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs', 'listCheckRuns', 'getCombinedStatus',
      'listReleases', 'getLatestRelease', 'getRelease',
    ],
  },
  {
    id: 'security-audit',
    label: 'security-audit',
    useCase: 'Vulnerability scanning, risk reporting',
    tools: [
      'getRepository', 'listBranches', 'getFileContent', 'getRepositoryTree',
      'listCommits', 'getCommit', 'getBlame', 'compareCommits',
      'searchCode', 'searchRepositories',
      'listPullRequests', 'getPullRequest', 'listPullRequestFiles',
      'listCheckRuns', 'getCombinedStatus',
      'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs',
      'listIssues', 'getIssue', 'createIssue', 'addIssueComment', 'addLabels',
    ],
  },
  {
    id: 'release-manager',
    label: 'release-manager',
    useCase: 'Changelog generation, release cutting',
    tools: [
      'getRepository', 'listBranches', 'listCommits', 'getCommit', 'compareCommits',
      'listReleases', 'getLatestRelease', 'getRelease', 'createRelease',
      'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs', 'triggerWorkflow',
      'listPullRequests', 'getPullRequest',
    ],
  },
  {
    id: 'maintainer',
    label: 'maintainer',
    useCase: 'Operator workflows with strict approvals',
    tools: TOOL_CATALOG.map(tool => tool.name),
  },
]
