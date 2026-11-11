import { z } from 'zod'
import { GITHUB_TOOL_CATALOG, type GithubWriteToolName } from './catalog'
import { mergeContextArgs, type GithubToolsContext } from './context'
import { githubToolsErrors } from './errors'

/** What a GitHub write acts on. Each write tool's catalog entry names one. */
export type GithubAuditTargetKind =
  | 'repository'
  | 'branch'
  | 'commit'
  | 'pull_request'
  | 'issue'
  | 'discussion'
  | 'comment'
  | 'review_thread'
  | 'label'
  | 'release'
  | 'workflow'
  | 'workflow_run'
  | 'gist'
  | 'notification'

/**
 * The target of a GitHub write, after `context` defaults: the repository, and the one field that
 * identifies a target of its `kind`. A write that creates its target has no identifying field
 * until GitHub accepts it.
 */
export type GithubAuditTarget = {
  kind: GithubAuditTargetKind
  /** Repository owner. Absent for gists and notifications. */
  owner?: string
  /** Repository name. Absent for gists and notifications. */
  repo?: string
  /** The number of a pull request, an issue, or a discussion. */
  number?: number
  /** A branch name, or a commit SHA. */
  ref?: string
  /** A label name. */
  name?: string
  /** GitHub's ID of a comment, review thread, release, workflow, workflow run, gist, or notification thread. */
  id?: string | number
  /** The URL GitHub returned for what the write created or changed. Set on a `succeeded` record. */
  url?: string
}

/** A person or a service as the channel authenticated them. */
export type GithubAuditPrincipal = {
  id: string
  /** `'user'` for a person. */
  type: string
  /** The channel authenticator that identified them. Absent for a person who denied a write they didn't request. */
  authenticator?: string
  issuer?: string
}

/**
 * What let a write run, or stopped it: nothing (`'none'`), `guardrails` or an approval policy
 * (`'policy'`), the decision model (`'auto'`), or a person (`'person'`).
 */
export type GithubAuditClearance = 'none' | 'policy' | 'auto' | 'person'

/** The decision model's answers for a write under `requireApproval: 'auto'`. */
export type GithubAuditVerdict = {
  /** 0 (negligible) to 2 (hard to undo). */
  risk: number
  /** Probability from 0 to 1 that the user asked for the write. */
  intent: number
}

export type GithubAuditOutcome = 'succeeded' | 'failed' | 'denied'

/**
 * One record of a GitHub write. A write that reaches GitHub has a `started` record, sent before
 * the request, and a `settled` record with its outcome. A write stopped before it ran has a
 * `settled` record only. The record names the target and holds nothing that was written.
 */
export type GithubAuditRecord = {
  /** The session and the call. The same in both phases and each time a record is sent again. */
  id: string
  phase: 'started' | 'settled'
  /** ISO 8601 time of this phase. */
  at: string
  tool: GithubWriteToolName
  target: GithubAuditTarget
  /** Set on a `settled` record. */
  outcome?: GithubAuditOutcome
  /** Why the write was denied or failed: the guardrail's or policy's reason, the decision model's sentence, or an error code. */
  reason?: string
  agent: { name: string }
  /** Who drove the turn. Absent when nobody did, as in a scheduled run. */
  requester?: GithubAuditPrincipal
  /** The person who approved the write, or who denied it. */
  approver?: GithubAuditPrincipal
  clearance: GithubAuditClearance
  /** Set when the decision model rated the write. */
  verdict?: GithubAuditVerdict
  /** Whose GitHub access the write used. Absent when the write was stopped before it ran. */
  githubIdentity?: 'app' | 'user'
  session: { id: string, turnId: string, callId: string, channel?: string }
  /** Set on a `settled` record that was delivered after its call settled. */
  reconciled?: true
}

/** The facts about a write that its records share. */
export type GithubAuditCall = Pick<
  GithubAuditRecord,
  'tool' | 'target' | 'agent' | 'requester' | 'approver' | 'clearance' | 'verdict' | 'githubIdentity' | 'session'
> & {
  /** Why `guardrails` or an approval policy denied the write, or the decision model's sentence when it asked a person. */
  reason?: string
}

/** How eve settled a call: `call.settled`'s data, or a call read from a session view. */
export type GithubAuditSettlement = {
  callId: string
  /** eve's call outcome. */
  outcome?: string
  error?: { code: string, message: string }
  output?: unknown
}

const TARGET_FIELD: Record<GithubAuditTargetKind, readonly ['number' | 'ref' | 'name' | 'id', string] | undefined> = {
  repository: undefined,
  branch: ['ref', 'branch'],
  commit: ['ref', 'sha'],
  pull_request: ['number', 'pullNumber'],
  issue: ['number', 'issueNumber'],
  discussion: ['number', 'discussionNumber'],
  comment: ['id', 'commentId'],
  review_thread: ['id', 'threadId'],
  label: ['name', 'name'],
  release: ['id', 'releaseId'],
  workflow: ['id', 'workflowId'],
  workflow_run: ['id', 'runId'],
  gist: ['id', 'gistId'],
  notification: ['id', 'threadId'],
}

function identifier(field: 'number' | 'ref' | 'name' | 'id', value: unknown): Partial<GithubAuditTarget> {
  if (field === 'number') return typeof value === 'number' ? { number: value } : {}
  if (field === 'id') return typeof value === 'string' || typeof value === 'number' ? { id: value } : {}
  return typeof value === 'string' ? { [field]: value } : {}
}

/**
 * The target of a write tool call, from its input once `context` defaults are applied. Only fields
 * the tool's schema declares count, since `context` adds its defaults to every input.
 */
export function githubAuditTarget(tool: GithubWriteToolName, input: Record<string, unknown>, context: GithubToolsContext = {}): GithubAuditTarget {
  const { target: kind, inputSchema } = GITHUB_TOOL_CATALOG[tool]
  const schema: z.ZodType = inputSchema
  const declared = schema instanceof z.ZodObject ? schema.shape : {}
  const merged = mergeContextArgs(input, context)
  const read = (key: string) => key in declared ? merged[key] : undefined
  // `createRepository` names the new repository with `org` and `name`.
  const owner = read(tool === 'createRepository' ? 'org' : 'owner')
  const repo = read(tool === 'createRepository' ? 'name' : 'repo')
  const field = TARGET_FIELD[kind]
  return {
    kind,
    ...(typeof owner === 'string' && { owner }),
    ...(typeof repo === 'string' && { repo }),
    ...(field && identifier(field[0], read(field[1]))),
  }
}

/** A stable ID for the records of one call. */
export function githubAuditRecordId(sessionId: string, callId: string): string {
  return `${sessionId}:${callId}`
}

function record(call: GithubAuditCall, phase: GithubAuditRecord['phase'], at: string): GithubAuditRecord {
  const { tool, target, agent, requester, approver, clearance, verdict, githubIdentity, session } = call
  return {
    id: githubAuditRecordId(session.id, session.callId),
    phase,
    at,
    tool,
    target,
    agent,
    ...(requester && { requester }),
    ...(approver && { approver }),
    clearance,
    ...(verdict && { verdict }),
    ...(githubIdentity && { githubIdentity }),
    session,
  }
}

/** The record of a write about to be sent to GitHub. */
export function githubAuditStarted(call: GithubAuditCall, at: string): GithubAuditRecord {
  return record(call, 'started', at)
}

// What GitHub returned fills the target's URL, and the identifying field of a target the write created.
function settledTarget(target: GithubAuditTarget, output: unknown): GithubAuditTarget {
  if (typeof output !== 'object' || output === null) return target
  const result = output as Record<string, unknown>
  const field = TARGET_FIELD[target.kind]?.[0]
  return {
    ...target,
    ...(field && target[field] === undefined && identifier(field, result[field])),
    ...(typeof result.url === 'string' && { url: result.url }),
  }
}

/**
 * The record of a write's outcome, or `undefined` when eve's outcome says nothing about the
 * write: an interrupted or abandoned call, whose `started` record stays without an outcome.
 *
 * - `completed` is `succeeded`.
 * - `failed` is `failed`, with the error code as `reason`. A write `guardrails` blocked in
 *   `execute` is `denied`.
 * - `rejected` is `denied`, with the reason kept from the approval policy, or eve's message when
 *   a person denied it.
 */
export function githubAuditSettled(call: GithubAuditCall, settlement: GithubAuditSettlement, at: string): GithubAuditRecord | undefined {
  const { outcome, error, output } = settlement
  if (outcome === 'completed') {
    return { ...record({ ...call, target: settledTarget(call.target, output) }, 'settled', at), outcome: 'succeeded' }
  }
  if (outcome === 'rejected') {
    const reason = call.reason ?? error?.message
    return { ...record(call, 'settled', at), outcome: 'denied', ...(reason && { reason }) }
  }
  if (outcome !== 'failed') return undefined
  if (error?.code === githubToolsErrors.GUARDRAIL_BLOCKED.code) {
    return { ...record(call, 'settled', at), outcome: 'denied', reason: error.message }
  }
  return { ...record(call, 'settled', at), outcome: 'failed', ...(error && { reason: error.code }) }
}

/**
 * The outcome records of tracked writes that a session view holds as settled: the ones whose
 * `call.settled` handler didn't deliver a record. `settled` holds the view's calls, and `at` reads
 * the time a call settled. Each record is marked `reconciled`.
 */
export function reconcileGithubAudit(
  calls: Readonly<Record<string, GithubAuditCall>>,
  settled: readonly (GithubAuditSettlement & { at: string })[],
): GithubAuditRecord[] {
  return settled.flatMap((settlement) => {
    const call = calls[settlement.callId]
    const built = call && githubAuditSettled(call, settlement, settlement.at)
    return built ? [{ ...built, reconciled: true as const }] : []
  })
}
