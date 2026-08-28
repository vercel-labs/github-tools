import type { Approval, ApprovalPolicy } from 'eve/tools/approval'
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

export function mapEveApprovalValue(value: EveApprovalValue): ApprovalPolicy {
  if (typeof value === 'function') return value
  // Object-shaped eve `ApprovalConfiguration` — the request-time policy lives on `request`.
  if (typeof value === 'object') return value.request

  const { always, never, once } = getEveApprovalHelpers()

  if (value === true || value === 'always') return always()
  if (value === false || value === 'never') return never()
  return once()
}

export function resolveEveApproval(
  toolName: GithubWriteToolName,
  config: EveApprovalConfig | undefined,
): ApprovalPolicy {
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
  const value = override !== undefined
    ? override
    : typeof config === 'object' && config !== null
      ? config[toolName]
      : config

  if (value === undefined) return getEveApprovalHelpers().always()
  if (isEveApprovalDisabled(value)) return undefined
  // Pass policies and `ApprovalConfiguration` objects through unchanged so a
  // response-time authorizer (`response`) survives onto `defineTool`.
  if (typeof value === 'function' || typeof value === 'object') return value
  return mapEveApprovalValue(value)
}
