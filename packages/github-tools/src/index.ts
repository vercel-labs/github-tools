import type { ToolSet } from 'ai'
import { getRepository, listBranches, getFileContent, createBranch, forkRepository, createRepository, createOrUpdateFile } from './tools/repository'
import { listPullRequests, getPullRequest, createPullRequest, mergePullRequest, addPullRequestComment, listPullRequestFiles, listPullRequestReviews, createPullRequestReview } from './tools/pull-requests'
import { listIssues, getIssue, createIssue, addIssueComment, closeIssue, listLabels, addLabels, removeLabel } from './tools/issues'
import { searchCode, searchRepositories } from './tools/search'
import { listCommits, getCommit, getBlame } from './tools/commits'
import { listGists, getGist, listGistComments, createGist, updateGist, deleteGist, createGistComment } from './tools/gists'
import { listWorkflows, listWorkflowRuns, getWorkflowRun, listWorkflowJobs, triggerWorkflow, cancelWorkflowRun, rerunWorkflowRun } from './tools/workflows'
import { resolveAiSdkApproval, type ApprovalConfig } from './core/approval'
import { resolvePresetTools, type GithubToolPreset } from './core/presets'
import { resolveGithubToken } from './core/token'
import type { GithubWriteToolName } from './core/write-tools'
import type { CommitIdentity, ToolOverrides } from './types'

export type { GithubWriteToolName } from './core/write-tools'
export type { ApprovalConfig } from './core/approval'
export type { GithubToolPreset } from './core/presets'

export type GithubToolsOptions = {
  /**
   * GitHub personal access token.
   * Falls back to `process.env.GITHUB_TOKEN` when omitted.
   */
  token?: string
  requireApproval?: ApprovalConfig
  /**
   * Per-tool overrides for customizing tool behavior (description, title, needsApproval, etc.)
   * without changing the underlying implementation. `execute`, `inputSchema`, and `outputSchema`
   * cannot be overridden.
   *
   * @example
   * ```ts
   * createGithubTools({
   *   overrides: {
   *     deleteGist: { needsApproval: false },
   *     listIssues: { description: 'List bugs for the current sprint' },
   *   }
   * })
   * ```
   */
  overrides?: Partial<Record<string, ToolOverrides>>
  /**
   * Restrict the returned tools to a predefined preset.
   * Omit to get all tools.
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
  /**
   * Default author for commit-creating tools.
   * The author is the person who originally wrote the code.
   * Falls back to the authenticated user when omitted.
   */
  author?: CommitIdentity
  /**
   * Default committer for commit-creating tools.
   * The committer is the person who applied the commit.
   * Falls back to the authenticated user when omitted.
   */
  committer?: CommitIdentity
  /**
   * Co-authors to attribute on all commits created by tools.
   * Added as "Co-authored-by" trailers to commit messages.
   *
   * @example
   * ```ts
   * createGithubTools({
   *   token,
   *   coAuthors: [
   *     { name: 'my-bot[bot]', email: '12345+my-bot[bot]@users.noreply.github.com' }
   *   ]
   * })
   * ```
   */
  coAuthors?: CommitIdentity[]
}

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
}: GithubToolsOptions = {}): ToolSet {
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
  }

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
    Object.entries(allTools).filter(([name]) => allowed.has(name))
  ) as Partial<typeof allTools>
}

export type GithubTools = ToolSet

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
