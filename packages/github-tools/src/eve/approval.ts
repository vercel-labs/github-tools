import type { Approval, ApprovalPolicy, ApprovalResponsePolicy } from 'eve/tools'
import type { GithubWriteToolName } from '../core/write-tools'
import { getEveApprovalHelpers } from './load-eve'
import type { EveApprovalConfig, EveApprovalValue, EveResponseApprovalConfig } from './types'

export function isEveApprovalDisabled(value: EveApprovalValue | undefined): boolean {
  return value === false || value === 'never'
}

/** Convert the request-policy shorthand accepted by the public API to eve's policy. */
export function mapEveApprovalValue(value: EveApprovalValue): ApprovalPolicy {
  if (typeof value === 'function') return value

  const { always, never, once } = getEveApprovalHelpers()
  if (value === true || value === 'always') return always() as ApprovalPolicy
  if (value === false || value === 'never') return never() as ApprovalPolicy
  if (value === 'once') return once() as ApprovalPolicy
  return always() as ApprovalPolicy
}

function resolveRequestPolicy(
  toolName: GithubWriteToolName,
  config: EveApprovalConfig | undefined,
  override?: EveApprovalValue,
): ApprovalPolicy {
  if (override !== undefined) return mapEveApprovalValue(override)
  if (config === undefined || config === true) return getEveApprovalHelpers().always() as ApprovalPolicy
  if (config === false) return getEveApprovalHelpers().never() as ApprovalPolicy
  return mapEveApprovalValue(config[toolName] ?? true)
}

export function resolveEveApproval(
  toolName: GithubWriteToolName,
  config: EveApprovalConfig | undefined,
): ApprovalPolicy {
  return resolveRequestPolicy(toolName, config)
}

function resolveResponsePolicy(
  toolName: GithubWriteToolName,
  config: EveResponseApprovalConfig | undefined,
): ApprovalResponsePolicy | undefined {
  return typeof config === 'function' ? config : config?.[toolName]
}

/** Resolve the complete approval definition without allowing request overrides to drop responder authorization. */
export function resolveEveToolApproval(
  toolName: GithubWriteToolName,
  config: EveApprovalConfig | undefined,
  override?: EveApprovalValue,
  responseConfig?: EveResponseApprovalConfig,
): Approval | undefined {
  const response = resolveResponsePolicy(toolName, responseConfig)
  const disabled = override !== undefined
    ? isEveApprovalDisabled(override)
    : config === false || (typeof config === 'object' && config !== null && isEveApprovalDisabled(config[toolName]))

  // Omit disabled approvals unless a response policy was explicitly configured.
  // In that case retain the complete definition so request-policy overrides do
  // not silently discard responder authorization.
  if (disabled && response === undefined) return undefined

  const request = resolveRequestPolicy(toolName, config, override)
  return response === undefined ? request : { request, response }
}
