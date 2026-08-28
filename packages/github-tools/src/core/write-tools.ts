import { GITHUB_WRITE_TOOL_NAMES, type GithubWriteToolName } from './catalog'

export type { GithubWriteToolName } from './catalog'
export { GITHUB_WRITE_TOOL_NAMES, isGithubWriteToolName } from './catalog'

/**
 * GitHub tools that perform write operations and require approval by default.
 * Derived from the `write: true` entries of `GITHUB_TOOL_CATALOG`.
 */
export const GITHUB_WRITE_TOOLS = Object.fromEntries(
  GITHUB_WRITE_TOOL_NAMES.map(name => [name, name]),
) as { [K in GithubWriteToolName]: K }
