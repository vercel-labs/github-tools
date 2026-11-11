import { githubAuditSettled, reconcileGithubAudit, type GithubAuditRecord } from '@github-tools/sdk/eve-runtime'
import { calls, delivery, interaction } from 'eve/events'
import { defineHook } from 'eve/hooks'
import extension from '../extension'
import { auditState, deliverAuditRecord, endTrackedTurn, settleTrackedWrite } from '../lib/audit'

// eve runs these for every call of the agent, once per mount. Session state belongs to the mount,
// so a write this mount tracked is one of its own. Nothing here throws: a hook that throws fails the turn.
export default defineHook({
  events: {
    'turn.started'(_event, ctx) {
      if (!extension.config.audit) return
      auditState.update(state => ({ ...state, turn: { agent: ctx.agent.name, channel: ctx.channel.kind } }))
    },

    // The person who answered an approval. `execute` replaces them with the approver it runs for, so
    // for a write that never runs this is who denied it.
    'response.submitted'(event, ctx) {
      if (!extension.config.audit) return
      const asked = interaction(ctx.view, event.data.interactionId)
      const callId = asked?.request.kind === 'approval' ? asked.call?.callId : undefined
      const write = callId === undefined ? undefined : auditState.get().writes[callId]
      const sender = delivery(ctx.view, event.data.deliveryId)?.principal
      if (!callId || !write || !sender) return
      const { requester } = write
      // A delivery names its sender without the authenticator, which the requester's own answer keeps.
      const approver = requester && requester.id === sender.id && requester.type === sender.type && requester.issuer === sender.issuer
        ? requester
        : { id: sender.id, type: sender.type, ...(sender.issuer && { issuer: sender.issuer }) }
      auditState.update(state => ({ ...state, writes: { ...state.writes, [callId]: { ...write, approver } } }))
    },

    async 'call.settled'(event, ctx) {
      if (!extension.config.audit) return
      const write = auditState.get().writes[event.data.callId]
      if (!write) return
      const record = githubAuditSettled({ ...write, agent: { name: ctx.agent.name } }, event.data, ctx.now.toISOString())
      // An interrupted call may run again, as after a sign-in: it stays tracked until its turn ends.
      if (!record) return
      const delivered = await deliverAuditRecord(record, ctx)
      settleTrackedWrite(event.data.callId, delivered ? undefined : record)
    },

    // Sends what `call.settled` didn't deliver: records the function rejected, on this turn or an
    // earlier one, and this turn's writes whose `call.settled` handler never ran.
    async 'turn.settled'(_event, ctx) {
      if (!extension.config.audit) return
      const { writes, undelivered } = auditState.get()
      if (Object.keys(writes).length === 0 && undelivered.length === 0) return
      const tracked = Object.fromEntries(Object.entries(writes).map(([callId, write]) => [callId, { ...write, agent: { name: ctx.agent.name } }]))
      const missed = reconcileGithubAudit(tracked, calls(ctx.view).map(call => ({ ...call, at: call.endedAt ?? ctx.now.toISOString() })))
      const rejected: GithubAuditRecord[] = []
      for (const record of [...undelivered.map(record => ({ ...record, reconciled: true as const })), ...missed]) {
        if (!await deliverAuditRecord(record, ctx)) rejected.push(record)
      }
      endTrackedTurn(rejected)
    },
  },
})
