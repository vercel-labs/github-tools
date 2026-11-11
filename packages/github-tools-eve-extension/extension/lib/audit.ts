import {
  githubAuditStarted,
  githubAuditTarget,
  githubToolsErrors,
  type AutoApprovalDecision,
  type EveGithubToolCallOptions,
  type EveGithubToolsOptions,
  type GithubAuditCall,
  type GithubAuditClearance,
  type GithubAuditPrincipal,
  type GithubAuditRecord,
  type GithubWriteToolName,
} from '@github-tools/sdk/eve-runtime'
import { defineState, type SessionAuthContext, type SessionContext } from 'eve/context'
import type { ToolContext } from 'eve/tools'
import type { ApprovalContext, ApprovalStatus } from 'eve/tools/approval'
import extension from '../extension'
import { sessionContext } from './context'

/** A write's facts as session state keeps them. A tool's context has no agent name, so records add it. */
export type TrackedWrite = Omit<GithubAuditCall, 'agent'>

type AuditState = {
  /** The agent's name and the channel of the running turn, stamped by the `turn.started` hook. */
  turn?: { agent: string, channel: string }
  /** The running turn's writes, by call ID, until their outcome record is delivered. */
  writes: Record<string, TrackedWrite>
  /** Outcome records the `audit` function rejected, oldest first. */
  undelivered: GithubAuditRecord[]
}

// A record holds no content, so the state stays small. Records dropped here are in the process log.
const MAX_UNDELIVERED = 100

export const auditState = defineState<AuditState>('github-tools.audit', () => ({ writes: {}, undelivered: [] }))

export function auditPrincipal(auth: SessionAuthContext): GithubAuditPrincipal {
  return {
    id: auth.principalId,
    type: auth.principalType,
    authenticator: auth.authenticator,
    ...(auth.issuer && { issuer: auth.issuer }),
  }
}

// Which gate decided, read from what the approval policy returned.
function clearanceOf(status: ApprovalStatus, decision: AutoApprovalDecision | undefined): GithubAuditClearance {
  const type = typeof status === 'object' ? status.type : status
  if (type === 'denied') return 'policy'
  if (type === true || type === 'user-approval') return 'person'
  if (type === 'approved') return decision ? 'auto' : 'policy'
  return 'none'
}

/**
 * Keeps what the approval policy knows about a write for its records: the requester, the target,
 * which gate decided, and the decision model's verdict. eve runs the policy again once a person
 * approves or signs in, and the first run's facts stand.
 */
export function trackGithubWrite(tool: GithubWriteToolName, ctx: ApprovalContext, status: ApprovalStatus, decision: AutoApprovalDecision | undefined) {
  if (!extension.config.audit || extension.config.dryRun) return
  const { writes, turn } = auditState.get()
  if (writes[ctx.callId]) return
  const requester = ctx.session.auth.current
  const reason = typeof status === 'object' && status.type === 'denied' ? status.reason : decision?.ask ? decision.reason : undefined
  const write: TrackedWrite = {
    tool,
    target: githubAuditTarget(tool, ctx.toolInput as Record<string, unknown>, sessionContext(requester)),
    // eve's own principal runs a turn nobody drove, such as a scheduled one.
    ...(requester && requester.principalType !== 'runtime' && { requester: auditPrincipal(requester) }),
    clearance: clearanceOf(status, decision),
    ...(decision?.risk !== undefined && decision.intent !== undefined && { verdict: { risk: decision.risk, intent: decision.intent } }),
    ...(reason && { reason }),
    session: { id: ctx.session.id, turnId: ctx.session.turn.id, callId: ctx.callId, ...(turn && { channel: turn.channel }) },
  }
  auditState.update(state => ({ ...state, writes: { ...state.writes, [ctx.callId]: write } }))
}

/** The decision model's sentence for a write it sent to a person, for an approval prompt in a process that didn't run the decision. */
export function trackedApprovalReason(callId: string): string | undefined {
  if (!extension.config.audit) return undefined
  const write = auditState.get().writes[callId]
  return write?.clearance === 'person' && write.verdict ? write.reason : undefined
}

/** Calls the `audit` function. A record it rejects is written to stderr in full, as one JSON line. */
export async function deliverAuditRecord(record: GithubAuditRecord, ctx: SessionContext): Promise<boolean> {
  try {
    await extension.config.audit!(record, ctx)
    return true
  } catch (error) {
    console.error(`[github-tools] audit ${JSON.stringify(record)}`)
    console.error('[github-tools] The `audit` function threw:', error)
    return false
  }
}

/**
 * Tool options that send a write's `started` record immediately before its request. When the
 * `audit` function rejects the record, the write isn't sent.
 */
export function withAuditStarted(options: EveGithubToolsOptions, ctx: ToolContext, githubIdentity: 'app' | 'user'): EveGithubToolCallOptions {
  if (!extension.config.audit) return options
  return {
    ...options,
    beforeWrite: async () => {
      const { writes, turn } = auditState.get()
      const approver = ctx.approval?.responder
      const write: TrackedWrite = {
        ...writes[ctx.callId]!,
        ...(approver && { approver: auditPrincipal(approver) }),
        githubIdentity,
      }
      auditState.update(state => ({ ...state, writes: { ...state.writes, [ctx.callId]: write } }))
      const record = githubAuditStarted({ ...write, agent: { name: turn!.agent } }, new Date().toISOString())
      if (!await deliverAuditRecord(record, ctx)) throw githubToolsErrors.AUDIT_UNAVAILABLE()
    },
  }
}

/** Stops tracking a write, and keeps its outcome record when the `audit` function rejected it. */
export function settleTrackedWrite(callId: string, undelivered?: GithubAuditRecord) {
  auditState.update((state) => {
    const writes = { ...state.writes }
    delete writes[callId]
    return {
      ...state,
      writes,
      undelivered: undelivered ? [...state.undelivered, undelivered].slice(-MAX_UNDELIVERED) : state.undelivered,
    }
  })
}

/** Ends a turn's tracking: its writes are final, and `undelivered` holds what the sweep couldn't deliver. */
export function endTrackedTurn(undelivered: GithubAuditRecord[]) {
  auditState.update(state => ({ ...state, writes: {}, undelivered: undelivered.slice(-MAX_UNDELIVERED) }))
}
