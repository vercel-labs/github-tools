import type { ToolSet } from 'ai'
import { getRepository, listBranches, getFileContent, getRepositoryTree, createBranch, forkRepository, createRepository, createOrUpdateFile } from './tools/repository'
import { listPullRequests, getPullRequest, createPullRequest, mergePullRequest, updatePullRequest, addPullRequestComment, updatePullRequestComment, deletePullRequestComment, listPullRequestFiles, listPullRequestReviews, createPullRequestReview, requestReviewers } from './tools/pull-requests'
import { listIssues, getIssue, createIssue, addIssueComment, updateIssueComment, deleteIssueComment, closeIssue, updateIssue, listLabels, addLabels, removeLabel, createLabel, updateLabel, deleteLabel, addAssignees, removeAssignees } from './tools/issues'
import { listIssueReactions, addIssueReaction, listCommentReactions, addCommentReaction } from './tools/reactions'
import { listDiscussions, getDiscussion, addDiscussionComment } from './tools/discussions'
import { listNotifications, markNotificationRead } from './tools/notifications'
import { searchCode, searchRepositories, searchIssues } from './tools/search'
import { listCommits, getCommit, getBlame, compareCommits } from './tools/commits'
import { listGists, getGist, listGistComments, createGist, updateGist, deleteGist, createGistComment } from './tools/gists'
import { listWorkflows, listWorkflowRuns, getWorkflowRun, listWorkflowJobs, triggerWorkflow, cancelWorkflowRun, rerunWorkflowRun } from './tools/workflows'
import { listCheckRuns, getCombinedStatus } from './tools/checks'
import { listReleases, getLatestRelease, getRelease, createRelease, updateRelease, deleteRelease } from './tools/releases'
import { getPullRequestContext, getIssueContext, getReleaseContext, getCiFailureContext } from './tools/bundles'
import { resolveAiSdkApproval } from './core/approval'
import { bindToolsContext } from './core/context'
import { resolvePresetTools, type CombinedPresetToolNames, type GithubToolPreset, type PresetToolName } from './core/presets'
import { type GithubToolName } from './core/tool-names'
import { type AllGithubTools, type GithubToolsBaseOptions } from './core/tool-types'
import { createGithubTokenResolver } from './core/token'
import type { GithubWriteToolName } from './core/write-tools'

export type { GithubWriteToolName } from './core/write-tools'
export type { ApprovalConfig } from './core/approval'
export type { GithubToolsContext } from './core/context'
export type { GithubToolPreset, PresetToolName, CombinedPresetToolNames } from './core/presets'
export type { GithubToolName } from './core/tool-names'
export type { AllGithubTools, GithubToolsForPreset, PickGithubTools } from './core/tool-types'
export { PRESET_TOOLS } from './core/presets'
export { GITHUB_TOOL_NAMES } from './core/tool-names'
export { GITHUB_WRITE_TOOLS } from './core/write-tools'

export type GithubToolsOptions = GithubToolsBaseOptions & {
  /**
   * Restrict the returned tools to a predefined preset.
   * Prefer a focused preset for most agents. Omit or use `maintainer` for the full catalog.
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
   *
   * // Full catalog
   * createGithubTools({ token, preset: 'maintainer' })
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
 * Prefer `preset` to expose only the tools your agent needs.
 * Pass `context` to default owner/repo/PR/issue/ref on tool inputs.
 *
 * @example
 * ```ts
 * // Code-review agent — only PR & commit tools
 * createGithubTools({ token, preset: 'code-review' })
 *
 * // Scoped to a repo / PR
 * createGithubTools({
 *   token,
 *   preset: 'code-review',
 *   context: { owner: 'vercel', repo: 'ai', pullNumber: 42 },
 * })
 *
 * // Combine presets
 * createGithubTools({ token, preset: ['code-review', 'issue-triage'] })
 *
 * // Full catalog (same as omitting preset)
 * createGithubTools({ token, preset: 'maintainer' })
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
  context,
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
    getRepositoryTree: getRepositoryTree(resolveToken),
    listPullRequests: listPullRequests(resolveToken),
    getPullRequest: getPullRequest(resolveToken),
    listIssues: listIssues(resolveToken),
    getIssue: getIssue(resolveToken),
    searchCode: searchCode(resolveToken),
    searchRepositories: searchRepositories(resolveToken),
    searchIssues: searchIssues(resolveToken),
    listCommits: listCommits(resolveToken),
    getCommit: getCommit(resolveToken),
    getBlame: getBlame(resolveToken),
    compareCommits: compareCommits(resolveToken),
    createBranch: createBranch(resolveToken, approval('createBranch')),
    forkRepository: forkRepository(resolveToken, approval('forkRepository')),
    createRepository: createRepository(resolveToken, approval('createRepository')),
    createOrUpdateFile: createOrUpdateFile(resolveToken, { ...approval('createOrUpdateFile'), author, committer, coAuthors }),
    createPullRequest: createPullRequest(resolveToken, approval('createPullRequest')),
    mergePullRequest: mergePullRequest(resolveToken, { ...approval('mergePullRequest'), coAuthors }),
    updatePullRequest: updatePullRequest(resolveToken, approval('updatePullRequest')),
    addPullRequestComment: addPullRequestComment(resolveToken, approval('addPullRequestComment')),
    updatePullRequestComment: updatePullRequestComment(resolveToken, approval('updatePullRequestComment')),
    deletePullRequestComment: deletePullRequestComment(resolveToken, approval('deletePullRequestComment')),
    listPullRequestFiles: listPullRequestFiles(resolveToken),
    listPullRequestReviews: listPullRequestReviews(resolveToken),
    createPullRequestReview: createPullRequestReview(resolveToken, approval('createPullRequestReview')),
    requestReviewers: requestReviewers(resolveToken, approval('requestReviewers')),
    getPullRequestContext: getPullRequestContext(resolveToken),
    getIssueContext: getIssueContext(resolveToken),
    createIssue: createIssue(resolveToken, approval('createIssue')),
    addIssueComment: addIssueComment(resolveToken, approval('addIssueComment')),
    updateIssueComment: updateIssueComment(resolveToken, approval('updateIssueComment')),
    deleteIssueComment: deleteIssueComment(resolveToken, approval('deleteIssueComment')),
    closeIssue: closeIssue(resolveToken, approval('closeIssue')),
    updateIssue: updateIssue(resolveToken, approval('updateIssue')),
    listLabels: listLabels(resolveToken),
    addLabels: addLabels(resolveToken, approval('addLabels')),
    removeLabel: removeLabel(resolveToken, approval('removeLabel')),
    createLabel: createLabel(resolveToken, approval('createLabel')),
    updateLabel: updateLabel(resolveToken, approval('updateLabel')),
    deleteLabel: deleteLabel(resolveToken, approval('deleteLabel')),
    addAssignees: addAssignees(resolveToken, approval('addAssignees')),
    removeAssignees: removeAssignees(resolveToken, approval('removeAssignees')),
    listIssueReactions: listIssueReactions(resolveToken),
    addIssueReaction: addIssueReaction(resolveToken, approval('addIssueReaction')),
    listCommentReactions: listCommentReactions(resolveToken),
    addCommentReaction: addCommentReaction(resolveToken, approval('addCommentReaction')),
    listDiscussions: listDiscussions(resolveToken),
    getDiscussion: getDiscussion(resolveToken),
    addDiscussionComment: addDiscussionComment(resolveToken, approval('addDiscussionComment')),
    listNotifications: listNotifications(resolveToken),
    markNotificationRead: markNotificationRead(resolveToken, approval('markNotificationRead')),
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
    listCheckRuns: listCheckRuns(resolveToken),
    getCombinedStatus: getCombinedStatus(resolveToken),
    getCiFailureContext: getCiFailureContext(resolveToken),
    listReleases: listReleases(resolveToken),
    getLatestRelease: getLatestRelease(resolveToken),
    getRelease: getRelease(resolveToken),
    getReleaseContext: getReleaseContext(resolveToken),
    createRelease: createRelease(resolveToken, approval('createRelease')),
    updateRelease: updateRelease(resolveToken, approval('updateRelease')),
    deleteRelease: deleteRelease(resolveToken, approval('deleteRelease')),
  } satisfies AllGithubTools

  if (overrides) {
    for (const [name, toolOverrides] of Object.entries(overrides)) {
      if (name in allTools && toolOverrides) {
        const key = name as keyof typeof allTools
        Object.assign(allTools, { [key]: { ...allTools[key], ...toolOverrides } })
      }
    }
  }

  const scoped = bindToolsContext(allTools, context)

  if (!allowed) return scoped

  return Object.fromEntries(
    Object.entries(scoped).filter(([name]) => allowed.has(name as GithubToolName))
  ) as Pick<typeof scoped, GithubToolName>
}

export type GithubTools = AllGithubTools & ToolSet

// Re-export individual tool factories for cherry-picking
export { createOctokit } from './client'
export { getRepository, listBranches, getFileContent, getRepositoryTree, createBranch, forkRepository, createRepository, createOrUpdateFile } from './tools/repository'
export { listPullRequests, getPullRequest, createPullRequest, mergePullRequest, updatePullRequest, addPullRequestComment, updatePullRequestComment, deletePullRequestComment, listPullRequestFiles, listPullRequestReviews, createPullRequestReview, requestReviewers } from './tools/pull-requests'
export { listIssues, getIssue, createIssue, addIssueComment, updateIssueComment, deleteIssueComment, closeIssue, updateIssue, listLabels, addLabels, removeLabel, createLabel, updateLabel, deleteLabel, addAssignees, removeAssignees } from './tools/issues'
export { listIssueReactions, addIssueReaction, listCommentReactions, addCommentReaction } from './tools/reactions'
export { listDiscussions, getDiscussion, addDiscussionComment } from './tools/discussions'
export { listNotifications, markNotificationRead } from './tools/notifications'
export { searchCode, searchRepositories, searchIssues } from './tools/search'
export { listCommits, getCommit, getBlame, compareCommits } from './tools/commits'
export { listGists, getGist, listGistComments, createGist, updateGist, deleteGist, createGistComment } from './tools/gists'
export { listWorkflows, listWorkflowRuns, getWorkflowRun, listWorkflowJobs, triggerWorkflow, cancelWorkflowRun, rerunWorkflowRun } from './tools/workflows'
export { listCheckRuns, getCombinedStatus } from './tools/checks'
export { listReleases, getLatestRelease, getRelease, createRelease, updateRelease, deleteRelease } from './tools/releases'
export { getPullRequestContext, getIssueContext, getReleaseContext, getCiFailureContext } from './tools/bundles'
export type { CommitIdentity, CommitToolOptions, GithubTool, Octokit, ToolOptions, ToolOverrides } from './types'
export type { GithubTokenInput } from './core/token'
export { resolveGithubToken } from './core/token'
export { createGithubAgent } from './agents'
export type { CreateGithubAgentOptions } from './agents'
