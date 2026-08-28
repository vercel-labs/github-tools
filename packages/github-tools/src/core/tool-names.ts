import { ALL_GITHUB_TOOL_NAMES, type GithubToolName } from './catalog'

export type { GithubToolName } from './catalog'
export { ALL_GITHUB_TOOL_NAMES } from './catalog'

/**
 * All GitHub tool names available via {@link createGithubTools}, keyed by name.
 * Derived from `GITHUB_TOOL_CATALOG` — the single source of truth for tools.
 */
export const GITHUB_TOOL_NAMES = Object.fromEntries(
  ALL_GITHUB_TOOL_NAMES.map(name => [name, name]),
) as { [K in GithubToolName]: K }
