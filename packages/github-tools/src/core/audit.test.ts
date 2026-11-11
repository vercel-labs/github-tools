import { describe, expect, it } from 'vitest'
import {
  githubAuditSettled,
  githubAuditStarted,
  githubAuditTarget,
  reconcileGithubAudit,
  type GithubAuditCall,
  type GithubAuditClearance,
  type GithubAuditTargetKind,
} from './audit'
import { GITHUB_TOOL_CATALOG, GITHUB_WRITE_TOOL_NAMES } from './catalog'

const repository = { owner: 'acme', repo: 'web' }
const requester = { id: 'U1', type: 'user', authenticator: 'slack' }

function write(overrides: Partial<GithubAuditCall> = {}): GithubAuditCall {
  return {
    tool: 'mergePullRequest',
    target: { kind: 'pull_request', ...repository, number: 250 },
    agent: { name: 'support' },
    requester,
    clearance: 'none',
    session: { id: 'session-1', turnId: 'turn_0', callId: 'call-1', channel: 'channel:slack' },
    ...overrides,
  }
}

describe('githubAuditTarget', () => {
  it('has a target kind for every write tool', () => {
    const kinds: GithubAuditTargetKind[] = ['repository', 'branch', 'commit', 'pull_request', 'issue', 'discussion', 'comment', 'review_thread', 'label', 'release', 'workflow', 'workflow_run', 'gist', 'notification']
    for (const tool of GITHUB_WRITE_TOOL_NAMES) {
      expect(kinds, tool).toContain(GITHUB_TOOL_CATALOG[tool].target)
      expect(githubAuditTarget(tool, {}).kind, tool).toBe(GITHUB_TOOL_CATALOG[tool].target)
    }
  })

  it.each([
    ['mergePullRequest', { ...repository, pullNumber: 250 }, { kind: 'pull_request', ...repository, number: 250 }],
    ['addIssueComment', { ...repository, issueNumber: 12, body: 'text' }, { kind: 'issue', ...repository, number: 12 }],
    ['addDiscussionComment', { ...repository, discussionNumber: 3, body: 'text' }, { kind: 'discussion', ...repository, number: 3 }],
    ['deleteBranch', { ...repository, branch: 'agent/fix' }, { kind: 'branch', ...repository, ref: 'agent/fix' }],
    ['createCommitStatus', { ...repository, sha: 'abc123', state: 'success' }, { kind: 'commit', ...repository, ref: 'abc123' }],
    ['deleteLabel', { ...repository, name: 'bug' }, { kind: 'label', ...repository, name: 'bug' }],
    ['updateIssueComment', { ...repository, commentId: 77, body: 'text' }, { kind: 'comment', ...repository, id: 77 }],
    ['resolveReviewThread', { threadId: 'PRRT_1' }, { kind: 'review_thread', id: 'PRRT_1' }],
    ['deleteRelease', { ...repository, releaseId: 9 }, { kind: 'release', ...repository, id: 9 }],
    ['triggerWorkflow', { ...repository, workflowId: 'ci.yml', ref: 'main' }, { kind: 'workflow', ...repository, id: 'ci.yml' }],
    ['cancelWorkflowRun', { ...repository, runId: 42 }, { kind: 'workflow_run', ...repository, id: 42 }],
    ['deleteGist', { gistId: 'g1' }, { kind: 'gist', id: 'g1' }],
    ['markNotificationRead', { threadId: 't1' }, { kind: 'notification', id: 't1' }],
    ['forkRepository', { ...repository, organization: 'other' }, { kind: 'repository', ...repository }],
    ['createRepository', { org: 'acme', name: 'new', description: 'text' }, { kind: 'repository', owner: 'acme', repo: 'new' }],
  ] as const)('reads the target of %s from its input', (tool, input, target) => {
    expect(githubAuditTarget(tool, input)).toEqual(target)
  })

  it('applies context defaults to the fields the tool takes', () => {
    const context = { ...repository, pullNumber: 250, issueNumber: 12 }
    expect(githubAuditTarget('mergePullRequest', {}, context)).toEqual({ kind: 'pull_request', ...repository, number: 250 })
    expect(githubAuditTarget('updateIssue', { issueNumber: 999 }, context)).toEqual({ kind: 'issue', ...repository, number: 999 })
    // `createIssue` takes no issue number, so the default doesn't name its target.
    expect(githubAuditTarget('createIssue', { title: 'text' }, context)).toEqual({ kind: 'issue', ...repository })
    // A gist has no repository.
    expect(githubAuditTarget('deleteGist', { gistId: 'g1' }, context)).toEqual({ kind: 'gist', id: 'g1' })
  })
})

describe('audit records', () => {
  it('builds the started record from the write', () => {
    expect(githubAuditStarted(write({ githubIdentity: 'app' }), '2026-11-11T10:00:00.000Z')).toEqual({
      id: 'session-1:call-1',
      phase: 'started',
      at: '2026-11-11T10:00:00.000Z',
      tool: 'mergePullRequest',
      target: { kind: 'pull_request', ...repository, number: 250 },
      agent: { name: 'support' },
      requester,
      clearance: 'none',
      githubIdentity: 'app',
      session: { id: 'session-1', turnId: 'turn_0', callId: 'call-1', channel: 'channel:slack' },
    })
  })

  it.each<{ clearance: GithubAuditClearance, githubIdentity: 'app' | 'user' }>([
    { clearance: 'none', githubIdentity: 'app' },
    { clearance: 'policy', githubIdentity: 'app' },
    { clearance: 'auto', githubIdentity: 'user' },
    { clearance: 'person', githubIdentity: 'user' },
  ])('keeps clearance $clearance and identity $githubIdentity in both phases', ({ clearance, githubIdentity }) => {
    const call = write({ clearance, githubIdentity, verdict: { risk: 0.2, intent: 0.9 }, approver: { id: 'U2', type: 'user', authenticator: 'slack' } })
    const started = githubAuditStarted(call, 'now')
    const settled = githubAuditSettled(call, { callId: 'call-1', outcome: 'completed' }, 'later')!
    for (const record of [started, settled]) {
      expect(record).toMatchObject({ id: 'session-1:call-1', clearance, githubIdentity, verdict: { risk: 0.2, intent: 0.9 }, approver: { id: 'U2' } })
    }
  })

  it('reports a completed call as succeeded, with what GitHub returned', () => {
    const created = write({ tool: 'createIssue', target: { kind: 'issue', ...repository } })
    expect(githubAuditSettled(created, { callId: 'call-1', outcome: 'completed', output: { number: 4242, title: 'not kept', url: 'https://github.com/acme/web/issues/4242' } }, 'later'))
      .toMatchObject({ phase: 'settled', at: 'later', outcome: 'succeeded', target: { kind: 'issue', ...repository, number: 4242, url: 'https://github.com/acme/web/issues/4242' } })
    // A comment's ID doesn't replace the issue it was added to.
    const commented = write({ tool: 'addIssueComment', target: { kind: 'issue', ...repository, number: 12 } })
    expect(githubAuditSettled(commented, { callId: 'call-1', outcome: 'completed', output: { id: 77, url: 'https://github.com/acme/web/issues/12#issuecomment-77' } }, 'later')!.target)
      .toEqual({ kind: 'issue', ...repository, number: 12, url: 'https://github.com/acme/web/issues/12#issuecomment-77' })
    expect(JSON.stringify(githubAuditSettled(created, { callId: 'call-1', outcome: 'completed', output: { number: 1, title: 'not kept' } }, 'later'))).not.toContain('not kept')
  })

  it('reports a failed call as failed, with the error code', () => {
    expect(githubAuditSettled(write(), { callId: 'call-1', outcome: 'failed', error: { code: 'github_tools.FORBIDDEN', message: 'GitHub refused the request (403)' } }, 'later'))
      .toMatchObject({ outcome: 'failed', reason: 'github_tools.FORBIDDEN' })
  })

  it('reports a call guardrails blocked in execute as denied', () => {
    expect(githubAuditSettled(write(), { callId: 'call-1', outcome: 'failed', error: { code: 'github_tools.GUARDRAIL_BLOCKED', message: 'Blocked by guardrails: `acme/web` is outside the repositories these tools may act on: `acme/api`.' } }, 'later'))
      .toMatchObject({ outcome: 'denied', reason: 'Blocked by guardrails: `acme/web` is outside the repositories these tools may act on: `acme/api`.' })
  })

  it('reports a rejected call as denied, with the policy\'s reason or eve\'s message', () => {
    const error = { code: 'TOOL_EXECUTION_DENIED', message: 'Tool execution was denied.' }
    expect(githubAuditSettled(write({ clearance: 'policy', reason: 'Outside the allowed repositories.' }), { callId: 'call-1', outcome: 'rejected', error }, 'later'))
      .toMatchObject({ outcome: 'denied', clearance: 'policy', reason: 'Outside the allowed repositories.' })
    const denied = githubAuditSettled(write({ clearance: 'person', approver: { id: 'U2', type: 'user' } }), { callId: 'call-1', outcome: 'rejected', error }, 'later')!
    expect(denied).toMatchObject({ outcome: 'denied', clearance: 'person', approver: { id: 'U2', type: 'user' }, reason: 'Tool execution was denied.' })
    expect(denied.githubIdentity).toBeUndefined()
  })

  it('lists a record\'s keys in the order of the type', () => {
    const denied = githubAuditSettled(
      write({ clearance: 'person', approver: { id: 'U2', type: 'user' }, verdict: { risk: 2, intent: 1 } }),
      { callId: 'call-1', outcome: 'rejected', error: { code: 'TOOL_EXECUTION_DENIED', message: 'Tool execution was denied.' } },
      'later',
    )!
    expect(Object.keys(denied)).toEqual(['id', 'phase', 'at', 'tool', 'target', 'outcome', 'reason', 'agent', 'requester', 'approver', 'clearance', 'verdict', 'session'])
  })

  it.each(['interrupted', 'abandoned', undefined])('has no outcome record for a call eve settled as %s', (outcome) => {
    expect(githubAuditSettled(write(), { callId: 'call-1', outcome }, 'later')).toBeUndefined()
  })
})

describe('reconcileGithubAudit', () => {
  it('returns the outcome records of tracked writes the view holds as settled', () => {
    const tracked = {
      'call-1': write(),
      'call-2': write({ session: { id: 'session-1', turnId: 'turn_0', callId: 'call-2' } }),
      'call-3': write({ session: { id: 'session-1', turnId: 'turn_0', callId: 'call-3' } }),
    }
    const records = reconcileGithubAudit(tracked, [
      { callId: 'call-1', outcome: 'completed', at: '2026-11-11T10:00:01.000Z' },
      // A call this mount doesn't track: a read, or another extension's tool.
      { callId: 'other', outcome: 'completed', at: '2026-11-11T10:00:02.000Z' },
      { callId: 'call-2', outcome: 'failed', error: { code: 'github_tools.NOT_FOUND', message: 'Not found' }, at: '2026-11-11T10:00:03.000Z' },
      { callId: 'call-3', outcome: 'abandoned', at: '2026-11-11T10:00:04.000Z' },
    ])
    expect(records.map(({ id, at, outcome, reason, reconciled }) => ({ id, at, outcome, reason, reconciled }))).toEqual([
      { id: 'session-1:call-1', at: '2026-11-11T10:00:01.000Z', outcome: 'succeeded', reason: undefined, reconciled: true },
      { id: 'session-1:call-2', at: '2026-11-11T10:00:03.000Z', outcome: 'failed', reason: 'github_tools.NOT_FOUND', reconciled: true },
    ])
  })

  it('returns nothing when no tracked write settled', () => {
    expect(reconcileGithubAudit({}, [{ callId: 'call-1', outcome: 'completed', at: 'now' }])).toEqual([])
    expect(reconcileGithubAudit({ 'call-1': write() }, [])).toEqual([])
  })
})
