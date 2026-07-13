import type { GithubToolPreset } from '../core/presets'

/** Vercel Connect scope strings mapped to each {@link GithubToolPreset}. */
export const PRESET_CONNECT_SCOPES = {
  'repo-explorer': [
    'contents:read',
    'metadata:read',
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
