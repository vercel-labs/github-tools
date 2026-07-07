import { buildEveToolDefinition, createEveGithubToolsDynamic } from './eve/build'
import type { EveToolFactoryOptions } from './eve/types'

export { buildEveToolDefinition, buildEveToolMap, createEveGithubToolsDynamic, listResolvedEveToolNames } from './eve/build'
export type { EveApprovalConfig, EveApprovalValue, EveGithubToolsOptions, EveToolFactoryOptions, EveToolOverrides } from './eve/types'
export type { GithubToolPreset, PresetToolName, CombinedPresetToolNames } from './core/presets'
export type { GithubToolName } from './core/tool-names'
export type { GithubWriteToolName } from './core/write-tools'
export type { AllGithubTools, GithubToolsForPreset, PickGithubTools } from './core/tool-types'
export type { CommitIdentity } from './types'
export { PRESET_TOOLS } from './core/presets'
export { GITHUB_TOOL_NAMES } from './core/tool-names'
export { GITHUB_WRITE_TOOLS } from './core/write-tools'
export { MISSING_EVE_MESSAGE } from './eve/load-eve'

/**
 * Register all GitHub tools (or a preset subset) as eve dynamic capabilities.
 *
 * Export as the default from `agent/tools/github.ts`:
 *
 * ```ts
 * import { createGithubTools } from '@github-tools/sdk/eve'
 * export default createGithubTools({ preset: 'code-review' })
 * ```
 */
export function createGithubTools(options?: import('./eve/types').EveGithubToolsOptions) {
  return createEveGithubToolsDynamic(options ?? {})
}

function factory(name: Parameters<typeof buildEveToolDefinition>[0]) {
  return (options?: EveToolFactoryOptions) => buildEveToolDefinition(name, options)
}

/** Get information about a GitHub repository including description, stars, forks, language, and default branch. */
export const getRepository = factory('getRepository')
/** List branches in a GitHub repository. */
export const listBranches = factory('listBranches')
/** Get the content of a file from a GitHub repository. */
export const getFileContent = factory('getFileContent')
/** Create a new branch in a GitHub repository from an existing branch or commit SHA. Requires approval by default. */
export const createBranch = factory('createBranch')
/** Fork a GitHub repository to the authenticated user account or a specified organization. Requires approval by default. */
export const forkRepository = factory('forkRepository')
/** Create a new GitHub repository for the authenticated user or a specified organization. Requires approval by default. */
export const createRepository = factory('createRepository')
/** Create or update a file in a GitHub repository. Provide the SHA when updating an existing file. Requires approval by default. */
export const createOrUpdateFile = factory('createOrUpdateFile')
/** List pull requests for a GitHub repository. */
export const listPullRequests = factory('listPullRequests')
/** Get detailed information about a specific pull request. */
export const getPullRequest = factory('getPullRequest')
/** Create a new pull request in a GitHub repository. Requires approval by default. */
export const createPullRequest = factory('createPullRequest')
/** Merge a pull request. Requires approval by default. */
export const mergePullRequest = factory('mergePullRequest')
/** Add a comment to a pull request. Requires approval by default. */
export const addPullRequestComment = factory('addPullRequestComment')
/** List files changed in a pull request, including diff status and patch content. */
export const listPullRequestFiles = factory('listPullRequestFiles')
/** List reviews on a pull request (approvals, change requests, and comments). */
export const listPullRequestReviews = factory('listPullRequestReviews')
/** Submit a pull request review with optional inline comments. Requires approval by default. */
export const createPullRequestReview = factory('createPullRequestReview')
/** List issues for a GitHub repository (excludes pull requests). */
export const listIssues = factory('listIssues')
/** Get detailed information about a specific issue. */
export const getIssue = factory('getIssue')
/** Create a new issue in a GitHub repository. Requires approval by default. */
export const createIssue = factory('createIssue')
/** Add a comment to a GitHub issue. Requires approval by default. */
export const addIssueComment = factory('addIssueComment')
/** Close an open GitHub issue. Requires approval by default. */
export const closeIssue = factory('closeIssue')
/** List labels available in a GitHub repository. */
export const listLabels = factory('listLabels')
/** Add labels to an issue or pull request. Requires approval by default. */
export const addLabels = factory('addLabels')
/** Remove a label from an issue or pull request. Requires approval by default. */
export const removeLabel = factory('removeLabel')
/** Search for code in GitHub repositories. Use qualifiers like "repo:owner/name" to scope the search. */
export const searchCode = factory('searchCode')
/** Search for GitHub repositories by keyword, topic, language, or other qualifiers. */
export const searchRepositories = factory('searchRepositories')
/** List commits for a GitHub repository. Filter by file path to see commits that touched a file. */
export const listCommits = factory('listCommits')
/** Get detailed information about a specific commit, including files changed with additions and deletions. */
export const getCommit = factory('getCommit')
/** Line-level git blame for a file at a commit-like ref (branch, tag, or SHA). */
export const getBlame = factory('getBlame')
/** List gists for the authenticated user or a specific user. */
export const listGists = factory('listGists')
/** Get a gist by ID, including file contents. */
export const getGist = factory('getGist')
/** List comments on a gist. */
export const listGistComments = factory('listGistComments')
/** Create a new gist with one or more files. Requires approval by default. */
export const createGist = factory('createGist')
/** Update an existing gist. Requires approval by default. */
export const updateGist = factory('updateGist')
/** Delete a gist permanently. Requires approval by default. */
export const deleteGist = factory('deleteGist')
/** Add a comment to a gist. Requires approval by default. */
export const createGistComment = factory('createGistComment')
/** List GitHub Actions workflows in a repository. */
export const listWorkflows = factory('listWorkflows')
/** List workflow runs for a repository, optionally filtered by workflow, branch, status, or event. */
export const listWorkflowRuns = factory('listWorkflowRuns')
/** Get details of a specific workflow run including status, timing, and trigger info. */
export const getWorkflowRun = factory('getWorkflowRun')
/** List jobs for a workflow run, including step-level status and timing. */
export const listWorkflowJobs = factory('listWorkflowJobs')
/** Trigger a workflow via workflow_dispatch event. Requires approval by default. */
export const triggerWorkflow = factory('triggerWorkflow')
/** Cancel an in-progress workflow run. Requires approval by default. */
export const cancelWorkflowRun = factory('cancelWorkflowRun')
/** Re-run a workflow run, optionally only the failed jobs. Requires approval by default. */
export const rerunWorkflowRun = factory('rerunWorkflowRun')
