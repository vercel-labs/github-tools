import { defineEval, type EveEvalContext, type EveEvalTurn } from 'eve/evals'
import { equals, includes } from 'eve/evals/expect'
import type { audited } from '../fixtures/audit'

type AuditRecord = ReturnType<typeof audited>['records'][number]

const as = (user: string) => ({ headers: { 'x-eval-user': user } })

function answer(turn: EveEvalTurn, optionId: 'approve' | 'deny', user: string) {
  return turn.session.respond([{ interactionId: turn.interactions[0]!.interactionId, optionId }], as(user))
}

async function audit(t: EveEvalContext): Promise<ReturnType<typeof audited>> {
  return JSON.parse((await t.send('audit records', as('alice'))).reply!)
}

// A session's records without the fields that differ on every run.
async function recordsOf(t: EveEvalContext, sessionId: string) {
  const { records } = await audit(t)
  return records.filter(record => record.session.id === sessionId).map(({ id: _id, at: _at, session, ...record }) => ({ ...record, channel: session.channel }))
}

const user = (id: string) => ({ id, type: 'user', authenticator: 'eval', issuer: 'https://eval.test' })
const agent = { name: 'eve-act-as-test' }
const repository = { owner: 'vercel-labs', repo: 'audited' }
const channel = 'channel:eve'

export default defineEval({
  description: 'sends the audit function a record before each GitHub write and one with its outcome',
  timeoutMs: 120_000,
  async test(t) {
    // A read has no record.
    const read = await t.send('audited read', as('alice'))
    t.check(read.requireToolCall('audited__getRepository').status, equals('completed'))
    t.check(await recordsOf(t, read.sessionId), equals([]))

    // A write a second person approves names the agent, the requester, and the approver in both records.
    const approved = await answer(await t.send('audited write', as('bob')), 'approve', 'alice')
    t.check(approved.reply, includes('4242'))
    const write = { tool: 'createIssue', agent, requester: user('bob'), approver: user('alice'), clearance: 'person', githubIdentity: 'user', channel }
    t.check(await recordsOf(t, approved.sessionId), equals([
      { phase: 'started', ...write, target: { kind: 'issue', ...repository } },
      { phase: 'settled', outcome: 'succeeded', ...write, target: { kind: 'issue', ...repository, number: 4242, url: 'https://github.com/vercel-labs/audited/issues/4242' } },
    ]))
    const ids = (await audit(t)).records.filter(record => record.session.id === approved.sessionId).map(record => record.id)
    t.check(new Set(ids).size, equals(1))

    // A write `guardrails` block has one record, with the reason, and asks nobody.
    const blocked = await t.send('audited elsewhere', as('alice'))
    t.check(blocked.interactions.length, equals(0))
    t.check(await recordsOf(t, blocked.sessionId), equals([{
      phase: 'settled',
      outcome: 'denied',
      reason: '`vercel-labs/github-tools` is outside the repositories these tools may act on: `vercel-labs/audited`.',
      tool: 'createIssue',
      agent,
      requester: user('alice'),
      clearance: 'policy',
      target: { kind: 'issue', owner: 'vercel-labs', repo: 'github-tools' },
      channel,
    }]))

    // A write a person denies has one record, which names them as eve identified their answer.
    const denied = await answer(await t.send('audited write', as('bob')), 'deny', 'erin')
    t.check(await recordsOf(t, denied.sessionId), equals([{
      phase: 'settled',
      outcome: 'denied',
      reason: 'Tool execution was denied.',
      tool: 'createIssue',
      agent,
      requester: user('bob'),
      approver: { id: 'erin', type: 'user', issuer: 'https://eval.test' },
      clearance: 'person',
      target: { kind: 'issue', ...repository },
      channel,
    }]))

    // A write the decision model lets through carries its verdict.
    const labeled = await t.send('audited label', as('alice'))
    t.check(labeled.interactions.length, equals(0))
    const label = { tool: 'addLabels', agent, requester: user('alice'), clearance: 'auto', verdict: { risk: 0, intent: 1 }, githubIdentity: 'user', target: { kind: 'issue', ...repository, number: 12 }, channel }
    t.check(await recordsOf(t, labeled.sessionId), equals([
      { phase: 'started', ...label },
      { phase: 'settled', outcome: 'succeeded', ...label },
    ]))

    // A person the agent's own policy asked is what let the write run, though the extension needed no approval.
    const gated = await answer(await t.send('audited comment 600', as('alice')), 'approve', 'alice')
    t.check(gated.requireToolCall('audited__addIssueComment').status, equals('completed'))
    t.check((await recordsOf(t, gated.sessionId)).map(({ phase, clearance, approver }) => ({ phase, clearance, approver })), equals([
      { phase: 'started', clearance: 'person', approver: user('alice') },
      { phase: 'settled', clearance: 'person', approver: user('alice') },
    ]))

    // A write GitHub refuses settles as failed, with the error code.
    const refused = await answer(await t.send('audited write', as('bob')), 'approve', 'bob')
    t.check(refused.reply, includes('github_tools.FORBIDDEN'))
    const own = { tool: 'createIssue', agent, requester: user('bob'), approver: user('bob'), clearance: 'person', githubIdentity: 'user', target: { kind: 'issue', ...repository }, channel }
    t.check(await recordsOf(t, refused.sessionId), equals([
      { phase: 'started', ...own },
      { phase: 'settled', outcome: 'failed', reason: 'github_tools.FORBIDDEN', ...own },
    ]))

    // Nobody drives a scheduled turn, so its records have an agent and no requester.
    const { sessionIds } = await t.target.dispatchSchedule('audited')
    const scheduled = await t.target.attach(sessionIds[0]!).nextTurn()
    t.check(scheduled.requireToolCall('audited__addIssueComment').status, equals('completed'))
    const comment = { tool: 'addIssueComment', agent, clearance: 'none', githubIdentity: 'app', channel: 'schedule' }
    t.check(await recordsOf(t, scheduled.sessionId), equals([
      { phase: 'started', ...comment, target: { kind: 'issue', ...repository, number: 1 } },
      { phase: 'settled', outcome: 'succeeded', ...comment, target: { kind: 'issue', ...repository, number: 1, url: 'https://github.com/vercel-labs/audited/issues/1#issuecomment-9' } },
    ]))

    // When the function rejects the `started` record, the write is not sent and the call fails.
    const unrecorded = await t.send('audited comment 500', as('alice'))
    unrecorded.calledTool('audited__addIssueComment', { status: 'failed', count: 1 })
    t.check(unrecorded.reply, includes('github_tools.AUDIT_UNAVAILABLE'))
    const { requests } = await audit(t)
    t.check(requests.filter(request => request.includes('/issues/500/')), equals([]))
    t.check(await recordsOf(t, unrecorded.sessionId), equals([{
      phase: 'settled',
      outcome: 'failed',
      reason: 'github_tools.AUDIT_UNAVAILABLE',
      tool: 'addIssueComment',
      agent,
      requester: user('alice'),
      clearance: 'none',
      githubIdentity: 'user',
      target: { kind: 'issue', ...repository, number: 500 },
      channel,
    }]))

    // An outcome the function rejects during its turn is delivered when a later turn ends.
    const pending = await t.send('audited comment 501', as('alice'))
    t.check(pending.requireToolCall('audited__addIssueComment').status, equals('completed'))
    t.check((await recordsOf(t, pending.sessionId)).map(record => record.phase), equals(['started']))
    await pending.session.send('audit records', as('alice'))
    t.check((await recordsOf(t, pending.sessionId)).map(({ phase, outcome, reconciled }) => ({ phase, outcome, reconciled })), equals([
      { phase: 'started', outcome: undefined, reconciled: undefined },
      { phase: 'settled', outcome: 'succeeded', reconciled: true },
    ]))
  },
})
