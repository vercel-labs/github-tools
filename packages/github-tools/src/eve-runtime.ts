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
export { resolveToolGuidance } from './core/instructions'
export { AUTO_APPROVAL_TOOLS, autoApprovalDecision, evaluatePresets, evaluateTools, fallbackPresets, fallbackTools, latestUserText, needsAutoApproval, selectPresets, selectTools } from './core/evaluation'
export type { AutoApprovalDecision, GithubEvaluationOptions } from './core/evaluation'
export { resolveGithubToken } from './core/token'
export { githubGuardrailViolation } from './eve/steps'
export type { GithubGuardrails } from './core/guardrails'
export { GITHUB_ROLES, githubRoleRank, withGithubCallerAccess } from './core/caller-access'
export type { GithubCaller, GithubRole } from './core/caller-access'
export type { GithubDryRunApproval, GithubDryRunResult } from './core/dry-run'
export type { GithubTokenCall } from './core/token'
export { githubToolsErrors } from './core/errors'
export { githubAuditRecordId, githubAuditSettled, githubAuditStarted, githubAuditTarget, reconcileGithubAudit } from './core/audit'
export type {
  GithubAuditCall,
  GithubAuditClearance,
  GithubAuditOutcome,
  GithubAuditPrincipal,
  GithubAuditRecord,
  GithubAuditSettlement,
  GithubAuditTarget,
  GithubAuditTargetKind,
  GithubAuditVerdict,
} from './core/audit'
export type {
  EveApprovalConfig,
  EveApprovalValue,
  EveGithubToolCallOptions,
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
