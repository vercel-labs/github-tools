import type { Approval, ApprovalPolicy, ApprovalResponsePolicy } from 'eve/tools'
import type { GithubWriteToolName } from '../core/write-tools'
import { getEveApprovalHelpers } from './load-eve'
import type { EveApprovalConfig, EveApprovalValue, EveResponseApprovalConfig } from './types'

/** Convert the request-policy shorthand accepted by the public API to eve's policy. */
export function mapEveApprovalValue(value: EveApprovalValue): ApprovalPolicy {
  if (typeof value === 'function') return value

  const { always, never, once } = getEveApprovalHelpers()

  if (value === true || value === 'always') return always() as ApprovalPolicy
  if (value === false || value === 'never') return never() as ApprovalPolicy
  if (value === 'once') return once() as ApprovalPolicy

  return always() as ApprovalPolicy
}

export function resolveEveApproval(
  toolName: GithubWriteToolName,
  config: EveApprovalConfig | undefined,
  override?: EveApprovalValue,
): ApprovalPolicy {
  if (override !== undefined) return mapEveApprovalValue(override)
  if (config === undefined || config === true) return getEveApprovalHelpers().always() as ApprovalPolicy
  if (config === false) return getEveApprovalHelpers().never() as ApprovalPolicy

  return mapEveApprovalValue(config[toolName] ?? true)
}

function resolveResponsePolicy(
  toolName: GithubWriteToolName,
  config: EveResponseApprovalConfig | undefined,
): ApprovalResponsePolicy | undefined {
  return typeof config === 'function' ? config : config?.[toolName]
}

/**
 * Resolve a write tool's complete approval definition in one place.
 * `authorizeApprovalResponse` is intentionally independent of request-policy
 * overrides, so changing when approval is requested cannot remove authorization
 * of the responder.
 */
export function resolveEveApprovalDefinition(
  toolName: GithubWriteToolName,
  config: EveApprovalConfig | undefined,
  responseConfig: EveResponseApprovalConfig | undefined,
  override?: EveApprovalValue,
): Approval {
  const request = resolveEveApproval(toolName, config, override)
  const response = resolveResponsePolicy(toolName, responseConfig)
  return response === undefined ? request : { request, response }
}
