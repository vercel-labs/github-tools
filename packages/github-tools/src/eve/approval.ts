import type { Approval } from 'eve/tools'
import type { GithubWriteToolName } from '../core/write-tools'
import { getEveApprovalHelpers } from './load-eve'
import type { EveApprovalConfig, EveApprovalValue } from './types'

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
