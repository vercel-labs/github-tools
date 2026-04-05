import { getRepository, listBranches, getFileContent, createBranch, forkRepository, createRepository, createOrUpdateFile } from './tools/repository'
import { listPullRequests, getPullRequest, createPullRequest, mergePullRequest, addPullRequestComment } from './tools/pull-requests'
import { listIssues, getIssue, createIssue, addIssueComment, closeIssue } from './tools/issues'
import { searchCode, searchRepositories } from './tools/search'
import { listCommits, getCommit, getBlame } from './tools/commits'
import { listGists, getGist, listGistComments, createGist, updateGist, deleteGist, createGistComment } from './tools/gists'
import { listWorkflows, listWorkflowRuns, getWorkflowRun, listWorkflowJobs, triggerWorkflow, cancelWorkflowRun, rerunWorkflowRun } from './tools/workflows'

export type GithubWriteToolName =
  | 'createBranch'
  | 'forkRepository'
  | 'createRepository'
  | 'createOrUpdateFile'
  | 'createPullRequest'
  | 'mergePullRequest'
  | 'addPullRequestComment'
  | 'createIssue'
  | 'addIssueComment'
  | 'closeIssue'
  | 'createGist'
  | 'updateGist'
  | 'deleteGist'
  | 'createGistComment'
  | 'triggerWorkflow'
  | 'cancelWorkflowRun'
  | 'rerunWorkflowRun'

/**
 * Whether write operations require user approval.
 * - `true`  — all write tools need approval (default)
 * - `false` — no approval needed for any write tool
 * - object  — per-tool override; unspecified write tools default to `true`
 *
 * @example
 * ```ts
 * requireApproval: {
 *   mergePullRequest: true,
 *   createOrUpdateFile: true,
 *   addPullRequestComment: false,
 *   addIssueComment: false,
 * }
 * ```
 */
export type ApprovalConfig = boolean | Partial<Record<GithubWriteToolName, boolean>>

/**
 * Predefined tool presets for common use cases.
 *
 * - `'code-review'` — Review PRs: read PRs, file content, commits, and post comments
 * - `'issue-triage'` — Triage issues: read/create/close issues, search, and comment
 * - `'repo-explorer'` — Explore repos: read-only access to repos, branches, code, and search
 * - `'ci-ops'`        — CI operations: monitor and manage GitHub Actions workflows
 * - `'maintainer'`   — Full maintenance: all read + create PRs, merge, manage issues
 */
export type GithubToolPreset = 'code-review' | 'issue-triage' | 'repo-explorer' | 'ci-ops' | 'maintainer'

const PRESET_TOOLS: Record<GithubToolPreset, string[]> = {
  'code-review': [
    'getPullRequest', 'listPullRequests', 'getFileContent', 'listCommits', 'getCommit', 'getBlame',
    'getRepository', 'listBranches', 'searchCode',
    'addPullRequestComment'
  ],
  'issue-triage': [
    'listIssues', 'getIssue', 'createIssue', 'addIssueComment', 'closeIssue',
    'getRepository', 'searchRepositories', 'searchCode'
  ],
  'ci-ops': [
    'getRepository', 'listBranches',
    'listCommits', 'getCommit',
    'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs',
    'triggerWorkflow', 'cancelWorkflowRun', 'rerunWorkflowRun'
  ],
  'repo-explorer': [
    'getRepository', 'listBranches', 'getFileContent',
    'listPullRequests', 'getPullRequest',
    'listIssues', 'getIssue',
    'listCommits', 'getCommit', 'getBlame',
    'searchCode', 'searchRepositories',
    'listGists', 'getGist', 'listGistComments',
    'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs'
  ],
  'maintainer': [
    'getRepository', 'listBranches', 'getFileContent', 'createBranch', 'forkRepository', 'createRepository', 'createOrUpdateFile',
    'listPullRequests', 'getPullRequest', 'createPullRequest', 'mergePullRequest', 'addPullRequestComment',
    'listIssues', 'getIssue', 'createIssue', 'addIssueComment', 'closeIssue',
    'listCommits', 'getCommit', 'getBlame',
    'searchCode', 'searchRepositories',
    'listGists', 'getGist', 'listGistComments', 'createGist', 'updateGist', 'deleteGist', 'createGistComment',
    'listWorkflows', 'listWorkflowRuns', 'getWorkflowRun', 'listWorkflowJobs', 'triggerWorkflow', 'cancelWorkflowRun', 'rerunWorkflowRun'
  ]
}

export type GithubToolsOptions = {
  /**
   * GitHub personal access token.
   * Falls back to `process.env.GITHUB_TOKEN` when omitted.
   */
  token?: string
  requireApproval?: ApprovalConfig
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
}

function resolveApproval(toolName: GithubWriteToolName, config: ApprovalConfig): boolean {
  if (typeof config === 'boolean') return config
  return config[toolName] ?? true
}

function resolvePresetTools(preset: GithubToolPreset | GithubToolPreset[]): Set<string> | null {
  if (!preset) return null
  const presets = Array.isArray(preset) ? preset : [preset]
  const tools = new Set<string>()
  for (const p of presets) {
    for (const t of PRESET_TOOLS[p]) tools.add(t)
  }
  return tools
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
export function createGithubTools({ token, requireApproval = true, preset }: GithubToolsOptions = {}) {
  const resolvedToken = token || process.env.GITHUB_TOKEN
  if (!resolvedToken) {
    throw new Error('GitHub token is required. Pass it as `token` or set the GITHUB_TOKEN environment variable.')
  }
  const approval = (name: GithubWriteToolName) => ({ needsApproval: resolveApproval(name, requireApproval) })
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
    createOrUpdateFile: createOrUpdateFile(resolvedToken, approval('createOrUpdateFile')),
    createPullRequest: createPullRequest(resolvedToken, approval('createPullRequest')),
    mergePullRequest: mergePullRequest(resolvedToken, approval('mergePullRequest')),
    addPullRequestComment: addPullRequestComment(resolvedToken, approval('addPullRequestComment')),
    createIssue: createIssue(resolvedToken, approval('createIssue')),
    addIssueComment: addIssueComment(resolvedToken, approval('addIssueComment')),
    closeIssue: closeIssue(resolvedToken, approval('closeIssue')),
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

  if (!allowed) return allTools

  return Object.fromEntries(
    Object.entries(allTools).filter(([name]) => allowed.has(name))
  ) as Partial<typeof allTools>
}

export type GithubTools = ReturnType<typeof createGithubTools>

// Re-export individual tool factories for cherry-picking
export { createOctokit } from './client'
export { getRepository, listBranches, getFileContent, createBranch, forkRepository, createRepository, createOrUpdateFile } from './tools/repository'
export { listPullRequests, getPullRequest, createPullRequest, mergePullRequest, addPullRequestComment } from './tools/pull-requests'
export { listIssues, getIssue, createIssue, addIssueComment, closeIssue } from './tools/issues'
export { searchCode, searchRepositories } from './tools/search'
export { listCommits, getCommit, getBlame } from './tools/commits'
export { listGists, getGist, listGistComments, createGist, updateGist, deleteGist, createGistComment } from './tools/gists'
export { listWorkflows, listWorkflowRuns, getWorkflowRun, listWorkflowJobs, triggerWorkflow, cancelWorkflowRun, rerunWorkflowRun } from './tools/workflows'
export type { Octokit, ToolOptions } from './types'
export { createGithubAgent } from './agents'
export type { CreateGithubAgentOptions } from './agents'
