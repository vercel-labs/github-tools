import { resolvePresetTools, type GithubToolPreset } from '../core/presets'
import { ALL_GITHUB_TOOL_NAMES, type GithubToolName } from '../core/tool-names'

/**
 * Vercel Connect scope strings mapped to each {@link GithubToolPreset}.
 *
 * Scopes mirror GitHub App permissions (`contents`, `pull_requests`, `issues`,
 * `discussions`, `actions`, `checks`, `statuses`, `administration`, `metadata`)
 * and must cover every read/write family a preset's tools touch, not just its
 * primary domain. Release tools fall under the `contents` permission on GitHub
 * Apps, and reaction tools under `issues`, so neither needs a scope of its own.
 *
 * Gist tools in `repo-explorer` and `maintainer` are intentionally left
 * unscoped: the Gists API only accepts GitHub App *user* access tokens, never
 * installation tokens, and Connect always mints `subject: { type: 'app' }`
 * installation tokens. Gist calls made with a Connect-derived token 403
 * regardless of requested scopes — use a fine-grained PAT with the "Gists"
 * account permission for those tools instead.
 *
 * Notification tools in `maintainer` and `notification-inbox` are unscoped for
 * the same reason: `notifications` is an account-level GitHub App permission
 * that only applies to user access tokens, so `listNotifications` /
 * `markNotificationRead` need a PAT with the "Notifications" account permission.
 */
export const PRESET_CONNECT_SCOPES = {
  'repo-explorer': [
    'contents:read',
    'metadata:read',
    'pull_requests:read',
    'issues:read',
    'discussions:read',
    'actions:read',
    'checks:read',
    'statuses:read',
  ],
  'code-review': [
    'contents:read',
    'metadata:read',
    'pull_requests:read',
    'pull_requests:write',
    'checks:read',
    'statuses:read',
  ],
  'issue-triage': [
    'contents:read',
    'metadata:read',
    'issues:read',
    'issues:write',
  ],
  'ci-ops': [
    'contents:read',
    'metadata:read',
    'actions:read',
    'actions:write',
    'checks:read',
    'statuses:read',
  ],
  'security-audit': [
    'contents:read',
    'metadata:read',
    'pull_requests:read',
    'issues:read',
    'issues:write',
    'actions:read',
    'checks:read',
    'statuses:read',
  ],
  'release-manager': [
    'contents:read',
    'contents:write',
    'metadata:read',
    'pull_requests:read',
    'actions:read',
    'actions:write',
  ],
  'discussion-moderator': [
    'contents:read',
    'metadata:read',
    'issues:read',
    'issues:write',
    'discussions:read',
    'discussions:write',
  ],
  'notification-inbox': [
    'contents:read',
    'metadata:read',
    'pull_requests:read',
    'issues:read',
  ],
  'pr-author': [
    'contents:read',
    'contents:write',
    'metadata:read',
    'pull_requests:read',
    'pull_requests:write',
  ],
  'maintainer': [
    'contents:read',
    'contents:write',
    'metadata:read',
    'pull_requests:read',
    'pull_requests:write',
    'issues:read',
    'issues:write',
    'discussions:read',
    'discussions:write',
    'actions:read',
    'actions:write',
    'checks:read',
    'statuses:read',
    'administration:read',
    'administration:write',
  ],
} as const satisfies Record<GithubToolPreset, readonly string[]>

/** Default scopes when no preset is specified — union of all preset scopes. */
const ALL_CONNECT_SCOPES = [
  ...new Set(Object.values(PRESET_CONNECT_SCOPES).flat()),
] as string[]

/** Stable scope order for tool-derived unions (tests + Connect payloads). */
const SCOPE_ORDER = [
  'contents:read',
  'contents:write',
  'metadata:read',
  'pull_requests:read',
  'pull_requests:write',
  'issues:read',
  'issues:write',
  'discussions:read',
  'discussions:write',
  'actions:read',
  'actions:write',
  'checks:read',
  'statuses:read',
  'administration:read',
  'administration:write',
] as const

const CONTENTS_READ = ['contents:read', 'metadata:read'] as const
const CONTENTS_WRITE = ['contents:read', 'contents:write', 'metadata:read'] as const
const PR_READ = ['contents:read', 'metadata:read', 'pull_requests:read'] as const
const PR_WRITE = ['contents:read', 'metadata:read', 'pull_requests:read', 'pull_requests:write'] as const
const PR_REVIEW = ['contents:read', 'metadata:read', 'pull_requests:read', 'pull_requests:write', 'checks:read', 'statuses:read'] as const
const ISSUES_READ = ['contents:read', 'metadata:read', 'issues:read'] as const
const ISSUES_WRITE = ['contents:read', 'metadata:read', 'issues:read', 'issues:write'] as const
const DISCUSSIONS_READ = ['contents:read', 'metadata:read', 'discussions:read'] as const
const DISCUSSIONS_WRITE = ['contents:read', 'metadata:read', 'discussions:read', 'discussions:write'] as const
const ACTIONS_READ = ['contents:read', 'metadata:read', 'actions:read'] as const
const ACTIONS_WRITE = ['contents:read', 'metadata:read', 'actions:read', 'actions:write'] as const
const CHECKS = ['contents:read', 'metadata:read', 'checks:read', 'statuses:read'] as const
const CI_CONTEXT = ['contents:read', 'metadata:read', 'actions:read', 'checks:read', 'statuses:read'] as const
const ADMIN = ['metadata:read', 'administration:read', 'administration:write'] as const
const SEARCH_REPOS = ['metadata:read'] as const
const SEARCH_ISSUES = ['metadata:read', 'issues:read', 'pull_requests:read'] as const
const UNSCOPED = [] as const

/**
 * Per-tool Connect scopes. Empty arrays are intentional for gist and
 * notification tools (installation tokens cannot satisfy those APIs).
 */
export const TOOL_CONNECT_SCOPES = {
  getRepository: CONTENTS_READ,
  listBranches: CONTENTS_READ,
  getFileContent: CONTENTS_READ,
  getRepositoryTree: CONTENTS_READ,
  createBranch: CONTENTS_WRITE,
  forkRepository: CONTENTS_READ,
  createRepository: ADMIN,
  createOrUpdateFile: CONTENTS_WRITE,

  listPullRequests: PR_READ,
  getPullRequest: PR_READ,
  createPullRequest: PR_WRITE,
  mergePullRequest: PR_WRITE,
  updatePullRequest: PR_WRITE,
  addPullRequestComment: PR_WRITE,
  updatePullRequestComment: PR_WRITE,
  deletePullRequestComment: PR_WRITE,
  listPullRequestFiles: PR_READ,
  listPullRequestReviews: PR_READ,
  createPullRequestReview: PR_WRITE,
  requestReviewers: PR_WRITE,
  getPullRequestContext: PR_REVIEW,

  listIssues: ISSUES_READ,
  getIssue: ISSUES_READ,
  getIssueContext: ISSUES_READ,
  createIssue: ISSUES_WRITE,
  addIssueComment: ISSUES_WRITE,
  updateIssueComment: ISSUES_WRITE,
  deleteIssueComment: ISSUES_WRITE,
  closeIssue: ISSUES_WRITE,
  updateIssue: ISSUES_WRITE,
  listLabels: ISSUES_READ,
  addLabels: ISSUES_WRITE,
  removeLabel: ISSUES_WRITE,
  addAssignees: ISSUES_WRITE,
  removeAssignees: ISSUES_WRITE,

  searchCode: CONTENTS_READ,
  searchRepositories: SEARCH_REPOS,
  searchIssues: SEARCH_ISSUES,

  listCommits: CONTENTS_READ,
  getCommit: CONTENTS_READ,
  getBlame: CONTENTS_READ,
  compareCommits: CONTENTS_READ,

  listGists: UNSCOPED,
  getGist: UNSCOPED,
  listGistComments: UNSCOPED,
  createGist: UNSCOPED,
  updateGist: UNSCOPED,
  deleteGist: UNSCOPED,
  createGistComment: UNSCOPED,

  listWorkflows: ACTIONS_READ,
  listWorkflowRuns: ACTIONS_READ,
  getWorkflowRun: ACTIONS_READ,
  listWorkflowJobs: ACTIONS_READ,
  triggerWorkflow: ACTIONS_WRITE,
  cancelWorkflowRun: ACTIONS_WRITE,
  rerunWorkflowRun: ACTIONS_WRITE,

  listCheckRuns: CHECKS,
  getCombinedStatus: CHECKS,
  getCiFailureContext: CI_CONTEXT,

  listDiscussions: DISCUSSIONS_READ,
  getDiscussion: DISCUSSIONS_READ,
  addDiscussionComment: DISCUSSIONS_WRITE,

  listNotifications: UNSCOPED,
  markNotificationRead: UNSCOPED,

  listIssueReactions: ISSUES_READ,
  addIssueReaction: ISSUES_WRITE,
  listCommentReactions: ISSUES_READ,
  addCommentReaction: ISSUES_WRITE,

  listReleases: CONTENTS_READ,
  getLatestRelease: CONTENTS_READ,
  getRelease: CONTENTS_READ,
  getReleaseContext: CONTENTS_READ,
  createRelease: CONTENTS_WRITE,
  updateRelease: CONTENTS_WRITE,
  deleteRelease: CONTENTS_WRITE,
} as const satisfies Record<GithubToolName, readonly string[]>

function orderScopes(scopes: Set<string>): string[] {
  return SCOPE_ORDER.filter(scope => scopes.has(scope))
}

/**
 * Returns Vercel Connect scopes for a preset or combined presets.
 * Without a preset, returns the union of all preset scopes (full tool set).
 */
export function connectGithubScopesForPreset(
  preset?: GithubToolPreset | GithubToolPreset[],
): string[] {
  if (!preset) return [...ALL_CONNECT_SCOPES]

  const presets = Array.isArray(preset) ? preset : [preset]
  return [
    ...new Set(presets.flatMap(p => PRESET_CONNECT_SCOPES[p])),
  ]
}

/**
 * Returns Connect scopes covering exactly the given tools.
 * Always includes `metadata:read`. Gist and notification tools contribute nothing.
 */
export function connectGithubScopesForTools(names: readonly GithubToolName[]): string[] {
  const scopes = new Set<string>(['metadata:read'])
  for (const name of names) {
    for (const scope of TOOL_CONNECT_SCOPES[name]) {
      scopes.add(scope)
    }
  }
  return orderScopes(scopes)
}

export type ConnectScopeSelection = {
  preset?: GithubToolPreset | GithubToolPreset[]
  include?: readonly GithubToolName[]
  exclude?: readonly GithubToolName[]
}

function resolveSelectedToolNames({
  preset,
  include,
  exclude,
}: ConnectScopeSelection): GithubToolName[] {
  const presetAllowed = preset ? resolvePresetTools(preset) : null
  const includeAllowed = include ? new Set(include) : null
  const excluded = exclude ? new Set(exclude) : null

  const allowed = presetAllowed && includeAllowed
    ? new Set([...presetAllowed, ...includeAllowed])
    : presetAllowed ?? includeAllowed

  return ALL_GITHUB_TOOL_NAMES.filter(
    name => (!allowed || allowed.has(name)) && !excluded?.has(name),
  )
}

/**
 * Resolves Connect scopes for the effective tool set.
 *
 * - No `include` / `exclude`: same as {@link connectGithubScopesForPreset}
 *   (omitted preset → full union, including `administration:write`).
 * - With `include` and/or `exclude`: scopes are derived from the resolved tools
 *   so a hand-picked `include` list does not mint the full admin surface.
 */
export function connectGithubScopesForSelection(selection: ConnectScopeSelection = {}): string[] {
  const { preset, include, exclude } = selection
  if (!include && !exclude) {
    return connectGithubScopesForPreset(preset)
  }
  return connectGithubScopesForTools(resolveSelectedToolNames(selection))
}
