import { PRESET_TOOLS, resolvePresetTools, type GithubToolPreset } from '../core/presets'
import { GITHUB_TOOL_CATALOG } from '../core/catalog'
import { ALL_GITHUB_TOOL_NAMES, type GithubToolName } from '../core/tool-names'

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
  'statuses:write',
  'administration:read',
  'administration:write',
  'security_events:read',
  'vulnerability_alerts:read',
  'secret_scanning_alerts:read',
] as const

/**
 * Per-tool Connect scopes, derived from `GITHUB_TOOL_CATALOG`. Empty arrays are
 * intentional for gist and notification tools (installation tokens cannot
 * satisfy those APIs).
 */
export const TOOL_CONNECT_SCOPES = ALL_GITHUB_TOOL_NAMES.reduce(
  (map, name) => {
    map[name] = GITHUB_TOOL_CATALOG[name].connectScopes
    return map
  },
  {} as Record<GithubToolName, readonly string[]>,
)

function orderScopes(scopes: Set<string>): string[] {
  return SCOPE_ORDER.filter(scope => scopes.has(scope))
}

/**
 * Vercel Connect scope strings mapped to each {@link GithubToolPreset}, derived
 * from the preset's tools so a tool added to a preset brings its scopes along.
 *
 * Scopes mirror GitHub App permissions (`contents`, `pull_requests`, `issues`,
 * `discussions`, `actions`, `checks`, `statuses`, `administration`, `metadata`,
 * and `security_events`, `vulnerability_alerts`, `secret_scanning_alerts` for the alert tools)
 * and must cover every read/write family a preset's tools touch, not just its
 * primary domain. Release tools fall under the `contents` permission on GitHub
 * Apps, and reaction tools under `issues`, so neither needs a scope of its own.
 *
 * Gist tools in `repo-explorer` and `maintainer` are intentionally left
 * unscoped: the Gists API only accepts GitHub App *user* access tokens, never
 * installation tokens, and Connect mints `subject: { type: 'app' }`
 * installation tokens by default. Gist calls made with an app-subject token
 * 403 regardless of requested scopes — use a `{ type: 'user' }` subject or a
 * fine-grained PAT with the "Gists" account permission for those tools instead.
 *
 * Notification tools in `maintainer` and `notification-inbox` are unscoped for
 * the same reason: `notifications` is an account-level GitHub App permission
 * that only applies to user access tokens, so `listNotifications` /
 * `markNotificationRead` need a PAT with the "Notifications" account permission.
 */
export const PRESET_CONNECT_SCOPES = (Object.keys(PRESET_TOOLS) as GithubToolPreset[]).reduce(
  (map, preset) => {
    map[preset] = connectGithubScopesForTools(PRESET_TOOLS[preset])
    return map
  },
  {} as Record<GithubToolPreset, readonly string[]>,
)

/** Default scopes when no preset is specified: every tool's scopes. */
const ALL_CONNECT_SCOPES = connectGithubScopesForTools(ALL_GITHUB_TOOL_NAMES)

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
