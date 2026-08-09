import type { Approval } from 'eve/tools'
import type { GithubWriteToolName } from '../core/write-tools'
import { getEveApprovalHelpers } from './load-eve'
import type { EveApprovalConfig, EveApprovalValue } from './types'

/**
 * `false` / `'never'` should omit the tool `approval` field entirely.
 * eve treats a missing `approval` like `never()`; attaching `never()` is
 * redundant and has caused approval UI noise on some channels.
 */
export function isEveApprovalDisabled(value: EveApprovalValue | undefined): boolean {
  return value === false || value === 'never'
}

export function mapEveApprovalValue(value: EveApprovalValue): Approval {
  if (typeof value === 'function') return value

  const { always, never, once } = getEveApprovalHelpers()

  if (value === true || value === 'always') return always()
  if (value === false || value === 'never') return never()
  if (value === 'once') return once()

  return always()
}

export function resolveEveApproval(
  toolName: GithubWriteToolName,
  config: EveApprovalConfig | undefined,
): Approval | undefined {
  if (config === undefined) return getEveApprovalHelpers().always()
  if (config === true) return getEveApprovalHelpers().always()
  if (config === false) return getEveApprovalHelpers().never()

  const value = config[toolName]
  if (value === undefined) return getEveApprovalHelpers().always()

  return mapEveApprovalValue(value)
}

/**
 * Approval to attach on a write tool, or `undefined` to omit the field.
 * Prefer this when building `defineTool` values so `false` / `'never'` do not
 * attach a redundant `never()` handler.
 */
export function resolveEveToolApproval(
  toolName: GithubWriteToolName,
  config: EveApprovalConfig | undefined,
  override?: EveApprovalValue,
): Approval | undefined {
  if (override !== undefined) {
    if (isEveApprovalDisabled(override)) return undefined
    return mapEveApprovalValue(override)
  }
  if (config === false) return undefined
  if (typeof config === 'object' && config !== null && isEveApprovalDisabled(config[toolName])) {
    return undefined
  }
  return resolveEveApproval(toolName, config)
}
