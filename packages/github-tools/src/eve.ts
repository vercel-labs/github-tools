import { buildEveToolDefinition, createEveGithubToolsDynamic } from './eve/build'
import type { EveToolFactoryOptions } from './eve/types'

export { buildEveToolDefinition, buildEveToolMap, createEveGithubToolsDynamic, listResolvedEveToolNames } from './eve/build'
export type { EveApprovalConfig, EveApprovalValue, EveGithubToolsOptions, EveToolFactoryOptions, EveToolOverrides } from './eve/types'
export type { GithubToolPreset } from './core/presets'
export type { GithubWriteToolName } from './core/write-tools'
export type { CommitIdentity } from './types'
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

export const getRepository = factory('getRepository')
export const listBranches = factory('listBranches')
export const getFileContent = factory('getFileContent')
export const createBranch = factory('createBranch')
export const forkRepository = factory('forkRepository')
export const createRepository = factory('createRepository')
export const createOrUpdateFile = factory('createOrUpdateFile')
export const listPullRequests = factory('listPullRequests')
export const getPullRequest = factory('getPullRequest')
export const createPullRequest = factory('createPullRequest')
export const mergePullRequest = factory('mergePullRequest')
export const addPullRequestComment = factory('addPullRequestComment')
export const listPullRequestFiles = factory('listPullRequestFiles')
export const listPullRequestReviews = factory('listPullRequestReviews')
export const createPullRequestReview = factory('createPullRequestReview')
export const listIssues = factory('listIssues')
export const getIssue = factory('getIssue')
export const createIssue = factory('createIssue')
export const addIssueComment = factory('addIssueComment')
export const closeIssue = factory('closeIssue')
export const listLabels = factory('listLabels')
export const addLabels = factory('addLabels')
export const removeLabel = factory('removeLabel')
export const searchCode = factory('searchCode')
export const searchRepositories = factory('searchRepositories')
export const listCommits = factory('listCommits')
export const getCommit = factory('getCommit')
export const getBlame = factory('getBlame')
export const listGists = factory('listGists')
export const getGist = factory('getGist')
export const listGistComments = factory('listGistComments')
export const createGist = factory('createGist')
export const updateGist = factory('updateGist')
export const deleteGist = factory('deleteGist')
export const createGistComment = factory('createGistComment')
export const listWorkflows = factory('listWorkflows')
export const listWorkflowRuns = factory('listWorkflowRuns')
export const getWorkflowRun = factory('getWorkflowRun')
export const listWorkflowJobs = factory('listWorkflowJobs')
export const triggerWorkflow = factory('triggerWorkflow')
export const cancelWorkflowRun = factory('cancelWorkflowRun')
export const rerunWorkflowRun = factory('rerunWorkflowRun')
