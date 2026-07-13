import type { ToolSet } from 'ai'
import { getRepository, listBranches, getFileContent, createBranch, forkRepository, createRepository, createOrUpdateFile } from './tools/repository'
import { listPullRequests, getPullRequest, createPullRequest, mergePullRequest, addPullRequestComment, listPullRequestFiles, listPullRequestReviews, createPullRequestReview } from './tools/pull-requests'
import { listIssues, getIssue, createIssue, addIssueComment, closeIssue, listLabels, addLabels, removeLabel } from './tools/issues'
import { searchCode, searchRepositories } from './tools/search'
import { listCommits, getCommit, getBlame } from './tools/commits'
import { listGists, getGist, listGistComments, createGist, updateGist, deleteGist, createGistComment } from './tools/gists'
import { listWorkflows, listWorkflowRuns, getWorkflowRun, listWorkflowJobs, triggerWorkflow, cancelWorkflowRun, rerunWorkflowRun } from './tools/workflows'
import { resolveAiSdkApproval } from './core/approval'
import { resolvePresetTools, type CombinedPresetToolNames, type GithubToolPreset, type PresetToolName } from './core/presets'
import { type GithubToolName } from './core/tool-names'
import { type AllGithubTools, type GithubToolsBaseOptions } from './core/tool-types'
import { createGithubTokenResolver } from './core/token'
import type { GithubWriteToolName } from './core/write-tools'

export type { GithubWriteToolName } from './core/write-tools'
export type { ApprovalConfig } from './core/approval'
export type { GithubToolPreset, PresetToolName, CombinedPresetToolNames } from './core/presets'
export type { GithubToolName } from './core/tool-names'
export type { AllGithubTools, GithubToolsForPreset, PickGithubTools } from './core/tool-types'
export { PRESET_TOOLS } from './core/presets'
export { GITHUB_TOOL_NAMES } from './core/tool-names'
export { GITHUB_WRITE_TOOLS } from './core/write-tools'

export type GithubToolsOptions = GithubToolsBaseOptions & {
  /**
   * Restrict the returned tools to a predefined preset.
   * Omit to get all tools.
   *
   * @see {@link GithubToolPreset} for available presets and included tools.
   *
   * @example
   * ```ts
   * // Only code-review tools
   * createGithubTools({ token, preset: 'code-review' })
   *
   * // Combine presets
   * createGithubTools({ token, preset: ['code-review', 'issue-triage'] })
   * ```
   */
  preset?: GithubToolPreset | GithubToolPreset[]
}

export function createGithubTools(options?: GithubToolsBaseOptions & { preset?: undefined }): AllGithubTools
export function createGithubTools<P extends GithubToolPreset>(
  options: GithubToolsBaseOptions & { preset: P },
): Pick<AllGithubTools, PresetToolName<P>>
export function createGithubTools<P extends readonly GithubToolPreset[]>(
  options: GithubToolsBaseOptions & { preset: P },
): Pick<AllGithubTools, CombinedPresetToolNames<P>>
export function createGithubTools(options?: GithubToolsOptions): AllGithubTools | Pick<AllGithubTools, GithubToolName>
/**
 * Create a set of GitHub tools for the Vercel AI SDK.
 *
 * Write operations require user approval by default.
 * Control this globally or per-tool via `requireApproval`.
 * Use `preset` to get only the tools you need.
 *
 * @example
 * ```ts
 * // All tools (default)
 * createGithubTools({ token })
 *
 * // Code-review agent — only PR & commit tools
 * createGithubTools({ token, preset: 'code-review' })
 *
 * // Combine presets
 * createGithubTools({ token, preset: ['code-review', 'issue-triage'] })
 *
 * // Granular approval
 * createGithubTools({
 *   token,
 *   preset: 'maintainer',
 *   requireApproval: {
 *     mergePullRequest: true,
 *     createOrUpdateFile: true,
 *     addPullRequestComment: false,
 *   }
 * })
 * ```
 */
export function createGithubTools({
  token,
  requireApproval = true,
  preset,
  overrides,
  author,
  committer,
  coAuthors,
}: GithubToolsOptions = {}): AllGithubTools | Pick<AllGithubTools, GithubToolName> {
  const resolveToken = createGithubTokenResolver(token)
  const approval = (name: GithubWriteToolName) => ({ needsApproval: resolveAiSdkApproval(name, requireApproval) })
  const allowed = preset ? resolvePresetTools(preset) : null

  const allTools = {
    getRepository: getRepository(resolveToken),
    listBranches: listBranches(resolveToken),
    getFileContent: getFileContent(resolveToken),
    listPullRequests: listPullRequests(resolveToken),
    getPullRequest: getPullRequest(resolveToken),
    listIssues: listIssues(resolveToken),
    getIssue: getIssue(resolveToken),
    searchCode: searchCode(resolveToken),
    searchRepositories: searchRepositories(resolveToken),
    listCommits: listCommits(resolveToken),
    getCommit: getCommit(resolveToken),
    getBlame: getBlame(resolveToken),
    createBranch: createBranch(resolveToken, approval('createBranch')),
    forkRepository: forkRepository(resolveToken, approval('forkRepository')),
    createRepository: createRepository(resolveToken, approval('createRepository')),
    createOrUpdateFile: createOrUpdateFile(resolveToken, { ...approval('createOrUpdateFile'), author, committer, coAuthors }),
    createPullRequest: createPullRequest(resolveToken, approval('createPullRequest')),
    mergePullRequest: mergePullRequest(resolveToken, { ...approval('mergePullRequest'), coAuthors }),
    addPullRequestComment: addPullRequestComment(resolveToken, approval('addPullRequestComment')),
    listPullRequestFiles: listPullRequestFiles(resolveToken),
    listPullRequestReviews: listPullRequestReviews(resolveToken),
    createPullRequestReview: createPullRequestReview(resolveToken, approval('createPullRequestReview')),
    createIssue: createIssue(resolveToken, approval('createIssue')),
    addIssueComment: addIssueComment(resolveToken, approval('addIssueComment')),
    closeIssue: closeIssue(resolveToken, approval('closeIssue')),
    listLabels: listLabels(resolveToken),
    addLabels: addLabels(resolveToken, approval('addLabels')),
    removeLabel: removeLabel(resolveToken, approval('removeLabel')),
    listGists: listGists(resolveToken),
    getGist: getGist(resolveToken),
    listGistComments: listGistComments(resolveToken),
    createGist: createGist(resolveToken, approval('createGist')),
    updateGist: updateGist(resolveToken, approval('updateGist')),
    deleteGist: deleteGist(resolveToken, approval('deleteGist')),
    createGistComment: createGistComment(resolveToken, approval('createGistComment')),
    listWorkflows: listWorkflows(resolveToken),
    listWorkflowRuns: listWorkflowRuns(resolveToken),
    getWorkflowRun: getWorkflowRun(resolveToken),
    listWorkflowJobs: listWorkflowJobs(resolveToken),
    triggerWorkflow: triggerWorkflow(resolveToken, approval('triggerWorkflow')),
    cancelWorkflowRun: cancelWorkflowRun(resolveToken, approval('cancelWorkflowRun')),
    rerunWorkflowRun: rerunWorkflowRun(resolveToken, approval('rerunWorkflowRun')),
  } satisfies AllGithubTools

  if (overrides) {
    for (const [name, toolOverrides] of Object.entries(overrides)) {
      if (name in allTools && toolOverrides) {
        const key = name as keyof typeof allTools
        Object.assign(allTools, { [key]: { ...allTools[key], ...toolOverrides } })
      }
    }
  }

  if (!allowed) return allTools

  return Object.fromEntries(
    Object.entries(allTools).filter(([name]) => allowed.has(name as GithubToolName))
  ) as Pick<typeof allTools, GithubToolName>
}

export type GithubTools = AllGithubTools & ToolSet

// Re-export individual tool factories for cherry-picking
export { createOctokit } from './client'
export { getRepository, listBranches, getFileContent, createBranch, forkRepository, createRepository, createOrUpdateFile } from './tools/repository'
export { listPullRequests, getPullRequest, createPullRequest, mergePullRequest, addPullRequestComment, listPullRequestFiles, listPullRequestReviews, createPullRequestReview } from './tools/pull-requests'
export { listIssues, getIssue, createIssue, addIssueComment, closeIssue, listLabels, addLabels, removeLabel } from './tools/issues'
export { searchCode, searchRepositories } from './tools/search'
export { listCommits, getCommit, getBlame } from './tools/commits'
export { listGists, getGist, listGistComments, createGist, updateGist, deleteGist, createGistComment } from './tools/gists'
export { listWorkflows, listWorkflowRuns, getWorkflowRun, listWorkflowJobs, triggerWorkflow, cancelWorkflowRun, rerunWorkflowRun } from './tools/workflows'
export type { CommitIdentity, CommitToolOptions, GithubTool, Octokit, ToolOptions, ToolOverrides } from './types'
export type { GithubTokenInput } from './core/token'
export { resolveGithubToken } from './core/token'
export { createGithubAgent } from './agents'
export type { CreateGithubAgentOptions } from './agents'
