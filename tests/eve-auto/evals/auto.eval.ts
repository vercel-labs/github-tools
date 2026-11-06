import { defineEval, type EveEvalTurn } from 'eve/evals'
import { equals, includes } from 'eve/evals/expect'

const as = (principal: string) => ({ headers: { 'x-eval-principal': principal } })

function kinds(turn: EveEvalTurn) {
  return turn.interactions.map(interaction => interaction.request.kind)
}

export default defineEval({
  description: 'routes with preset: auto and auto-approves only low-risk writes a person asked for',
  async test(t) {
    // Each Connect token covers only the tool being called, not every preset auto might route to.
    const read = await t.send('read', as('user:alice'))
    t.check(read.requireToolCall('github__getRepository').status, equals('completed'))

    // A low-risk write the person asked for runs without approval.
    const bug = await t.send('label bug', as('user:alice'))
    t.check(kinds(bug), equals([]))
    t.check(bug.requireToolCall('github__addLabels').status, equals('completed'))

    // A service caller's message is not a person's request, so it always asks.
    const service = await t.send('label bug', as('service:ci'))
    t.check(kinds(service), equals(['approval']))

    // A risky write asks; approving it does not call the evaluation model again.
    const wontfix = await t.send('label wontfix', as('user:alice'))
    t.check(kinds(wontfix), equals(['approval']))
    const approved = await wontfix.session.respond([{ interactionId: wontfix.interactions[0]!.interactionId, optionId: 'approve' }], as('user:alice'))
    t.check(approved.reply, includes('wontfix'))

    // By default, only the picked tool and the core read tools are listed.
    const picked = await t.send('picked tools', as('user:alice'))
    t.check(JSON.parse(picked.reply ?? '[]'), equals(['picked__addLabels', 'picked__getFileContent', 'picked__getRepository', 'picked__getRepositoryTree', 'picked__listCommits', 'picked__searchCode']))
    // A tool that was not picked is deferred, not removed: the model still reaches it through eve__tool.
    const deferred = await picked.session.send('picked deferred', as('user:alice'))
    t.check(deferred.requireToolCall('picked__listBranches').status, equals('completed'))

    // Tools are picked once per session, so a later request that would pick others keeps the list.
    const later = await deferred.session.send('picked tools to merge', as('user:alice'))
    t.check(JSON.parse(later.reply ?? '[]'), equals(JSON.parse(picked.reply ?? '[]')))

    // With scope: 'turn', each new request picks again.
    const rerouted = await t.send('rerouted tools', as('user:alice'))
    t.check(JSON.parse(rerouted.reply ?? '[]'), includes('rerouted__addLabels'))
    const reroutedLater = await rerouted.session.send('rerouted tools to merge', as('user:alice'))
    t.check(JSON.parse(reroutedLater.reply ?? '[]'), includes('rerouted__mergePullRequest'))

    // With selection: 'presets', presets are routed once per session too.
    const routed = await t.send('routed tools', as('user:alice'))
    t.check(JSON.parse(routed.reply ?? '[]'), includes('presets__addLabels'))
    const routedLater = await routed.session.send('routed tools for CI', as('user:alice'))
    t.check(JSON.parse(routedLater.reply ?? '[]'), equals(JSON.parse(routed.reply ?? '[]')))

    const records = await t.send('recorded', as('user:alice'))
    t.check(JSON.parse(records.reply ?? '{}'), equals({
      // Connect reuses a token for the same params, so the later addLabels calls mint none.
      connectScopes: [
        'contents:read metadata:read',
        'contents:read metadata:read issues:read issues:write',
      ],
      approvalEvaluations: 2,
    }))
  },
})
