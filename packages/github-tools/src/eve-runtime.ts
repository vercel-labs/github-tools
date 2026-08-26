/**
 * Shared eve runtime primitives for `@github-tools/eve-extension` and advanced
 * integrations. Not deprecated — prefer this subpath over `@github-tools/sdk/eve`
 * when you need descriptors, execution, or approval helpers rather than the
 * legacy `agent/tools/` registration API.
 */

export {
  buildEveToolDefinition,
  buildEveToolMap,
  createEveGithubToolsDynamic,
  listResolvedEveToolNames,
  listEveToolDescriptors,
  executeGithubEveTool,
  formatGithubEveToolOutput,
  hasGithubEveToolModelOutput,
} from './eve/build'
export { mapEveApprovalValue, resolveEveApproval, resolveEveToolApproval, isEveApprovalDisabled } from './eve/approval'
export type {
  EveApprovalConfig,
  EveApprovalValue,
  EveGithubToolsOptions,
  EveToolFactoryOptions,
  EveToolOverrides,
} from './eve/types'
export type { GithubToolPreset, PresetToolName, CombinedPresetToolNames } from './core/presets'
export type { GithubRateLimit } from './core/rate-limit'
export type { GithubToolName } from './core/tool-names'
export type { GithubWriteToolName } from './core/write-tools'
export type { AllGithubTools, GithubToolsForPreset, PickGithubTools } from './core/tool-types'
export type { CommitIdentity } from './types'
export { PRESET_TOOLS } from './core/presets'
export { GITHUB_TOOL_NAMES } from './core/tool-names'
export { GITHUB_WRITE_TOOLS } from './core/write-tools'
export { MISSING_EVE_MESSAGE } from './eve/load-eve'
