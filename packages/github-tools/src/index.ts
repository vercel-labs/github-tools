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
import { resolveGithubToken } from './core/token'
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
  const resolvedToken = resolveGithubToken(token)
  const approval = (name: GithubWriteToolName) => ({ needsApproval: resolveAiSdkApproval(name, requireApproval) })
  const allowed = preset ? resolvePresetTools(preset) : null

  const allTools = {
    getRepository: getRepository(resolvedToken),
    listBranches: listBranches(resolvedToken),
    getFileContent: getFileContent(resolvedToken),
    listPullRequests: listPullRequests(resolvedToken),
    getPullRequest: getPullRequest(resolvedToken),
    listIssues: listIssues(resolvedToken),
    getIssue: getIssue(resolvedToken),
    searchCode: searchCode(resolvedToken),
    searchRepositories: searchRepositories(resolvedToken),
    listCommits: listCommits(resolvedToken),
    getCommit: getCommit(resolvedToken),
    getBlame: getBlame(resolvedToken),
    createBranch: createBranch(resolvedToken, approval('createBranch')),
    forkRepository: forkRepository(resolvedToken, approval('forkRepository')),
    createRepository: createRepository(resolvedToken, approval('createRepository')),
    createOrUpdateFile: createOrUpdateFile(resolvedToken, { ...approval('createOrUpdateFile'), author, committer, coAuthors }),
    createPullRequest: createPullRequest(resolvedToken, approval('createPullRequest')),
    mergePullRequest: mergePullRequest(resolvedToken, { ...approval('mergePullRequest'), coAuthors }),
    addPullRequestComment: addPullRequestComment(resolvedToken, approval('addPullRequestComment')),
    listPullRequestFiles: listPullRequestFiles(resolvedToken),
    listPullRequestReviews: listPullRequestReviews(resolvedToken),
    createPullRequestReview: createPullRequestReview(resolvedToken, approval('createPullRequestReview')),
    createIssue: createIssue(resolvedToken, approval('createIssue')),
    addIssueComment: addIssueComment(resolvedToken, approval('addIssueComment')),
    closeIssue: closeIssue(resolvedToken, approval('closeIssue')),
    listLabels: listLabels(resolvedToken),
    addLabels: addLabels(resolvedToken, approval('addLabels')),
    removeLabel: removeLabel(resolvedToken, approval('removeLabel')),
    listGists: listGists(resolvedToken),
    getGist: getGist(resolvedToken),
    listGistComments: listGistComments(resolvedToken),
    createGist: createGist(resolvedToken, approval('createGist')),
    updateGist: updateGist(resolvedToken, approval('updateGist')),
    deleteGist: deleteGist(resolvedToken, approval('deleteGist')),
    createGistComment: createGistComment(resolvedToken, approval('createGistComment')),
    listWorkflows: listWorkflows(resolvedToken),
    listWorkflowRuns: listWorkflowRuns(resolvedToken),
    getWorkflowRun: getWorkflowRun(resolvedToken),
    listWorkflowJobs: listWorkflowJobs(resolvedToken),
    triggerWorkflow: triggerWorkflow(resolvedToken, approval('triggerWorkflow')),
    cancelWorkflowRun: cancelWorkflowRun(resolvedToken, approval('cancelWorkflowRun')),
    rerunWorkflowRun: rerunWorkflowRun(resolvedToken, approval('rerunWorkflowRun')),
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
export { createGithubAgent } from './agents'
export type { CreateGithubAgentOptions } from './agents'
