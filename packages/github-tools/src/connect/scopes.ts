import type { GithubToolPreset } from '../core/presets'

/**
 * Vercel Connect scope strings mapped to each {@link GithubToolPreset}.
 *
 * Scopes mirror GitHub App permissions (`contents`, `pull_requests`, `issues`,
 * `actions`, `administration`, `metadata`) and must cover every read/write
 * family a preset's tools touch, not just its primary domain.
 *
 * Gist tools in `repo-explorer` and `maintainer` are intentionally left
 * unscoped: the Gists API only accepts GitHub App *user* access tokens, never
 * installation tokens, and Connect always mints `subject: { type: 'app' }`
 * installation tokens. Gist calls made with a Connect-derived token 403
 * regardless of requested scopes — use a fine-grained PAT with the "Gists"
 * account permission for those tools instead.
 */
export const PRESET_CONNECT_SCOPES = {
  'repo-explorer': [
    'contents:read',
    'metadata:read',
    'pull_requests:read',
    'issues:read',
    'actions:read',
  ],
  'code-review': [
    'contents:read',
    'metadata:read',
    'pull_requests:read',
    'pull_requests:write',
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
  ],
  'maintainer': [
    'contents:read',
    'contents:write',
    'metadata:read',
    'pull_requests:read',
    'pull_requests:write',
    'issues:read',
    'issues:write',
    'actions:read',
    'actions:write',
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
