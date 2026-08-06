import type { GithubToolPreset } from '../core/presets'

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
