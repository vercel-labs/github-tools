import { defineEval, type EveEvalContext, type EveEvalTurn } from 'eve/evals'
import { equals, includes, satisfies } from 'eve/evals/expect'

const as = (user: string) => ({ headers: { 'x-eval-user': user } })

function answer(turn: EveEvalTurn, optionId: 'approve' | 'deny', user: string) {
  return turn.session.respond([{ interactionId: turn.interactions[0]!.interactionId, optionId }], as(user))
}

function kinds(turn: EveEvalTurn) {
  return turn.interactions.map(interaction => interaction.request.kind)
}

// Completes a sign-in the way the browser would after consent, then reads the resumed turn.
async function completeSignIn(t: EveEvalContext, turn: EveEvalTurn) {
  const url = turn.interactions.find(interaction => interaction.request.kind === 'sign-in')?.request.signIn?.url
  if (!url) throw new Error('Expected a sign-in with a URL.')
  const { pathname, search } = new URL(url)
  const callback = await t.target.fetch(`${pathname}${search}`)
  if (!callback.ok) throw new Error(`Sign-in callback failed (${callback.status}).`)
  return turn.session.nextTurn()
}

export default defineEval({
  description: 'picks the App, the requester or the approver as the GitHub identity of each call',
  timeoutMs: 120_000,
  async test(t) {
    // actAs: 'caller', approvers: 'anyone' (`github__*`)

    // Nobody drives a scheduled turn, so it runs as the App.
    const { sessionIds } = await t.target.dispatchSchedule('autonomous')
    const scheduled = await t.target.attach(sessionIds[0]!).nextTurn()
    t.check(scheduled.requireToolCall('github__getRepository').status, equals('completed'))

    // A local dev caller is not a signed-in user either.
    const local = await t.send('read')
    t.check(local.requireToolCall('github__getRepository').status, equals('completed'))

    // A signed-in user's turn runs as them.
    const read = await t.send('read', as('alice'))
    t.check(read.requireToolCall('github__getRepository').status, equals('completed'))

    // A reader approving their own write gets GitHub's refusal, not the App's access.
    const ownWrite = await t.send('write', as('bob'))
    t.check(ownWrite.interactions.map(interaction => interaction.request.prompt), equals(['Create issue on vercel-labs/github-tools?']))
    t.check((await answer(ownWrite, 'approve', 'bob')).reply, includes('github_tools.FORBIDDEN'))

    // Anyone signed in can deny, without connecting GitHub first.
    const denied = await answer(await t.send('write', as('bob')), 'deny', 'erin')
    t.check(kinds(denied), equals([]))
    t.check(denied.reply, satisfies(reply => !reply?.includes('4242'), 'denied write does not run'))

    // A maintainer approves a reader's write: they sign in first, then the write runs with their token.
    const request = await t.send('write', as('bob'))
    const approving = await answer(request, 'approve', 'carol')
    t.check(kinds(approving), equals(['approval', 'sign-in']))
    const approved = await completeSignIn(t, approving)
    t.check(approved.reply, includes('4242'))

    // An App tool still needs a signed-in approver, and the approved call runs as the App.
    const comment = await t.send('comment', as('bob'))
    const byLocal = await comment.session.respond([{ interactionId: comment.interactions[0]!.interactionId, optionId: 'approve' }])
    const localRefusal = byLocal.session.events.findLast(event => event.type === 'response.settled')
    t.check(localRefusal?.data, satisfies(data => (data as { outcome?: string }).outcome === 'refused', 'approval by a caller who is not signed in is refused'))
    const commented = await byLocal.session.respond([{ interactionId: comment.interactions[0]!.interactionId, optionId: 'approve' }], as('bob'))
    t.check(commented.reply, includes('issuecomment-77'))

    // actAs: 'user', approvers: 'requester' (`strict__*`)

    // With no signed-in user, the call fails instead of falling back to the App.
    const anonymous = await t.send('strict read')
    t.check(anonymous.toolCalls.map(call => call.status), satisfies(statuses => !statuses.includes('completed'), 'no signed-in user, no GitHub call'))

    // Only the requester can answer their approval.
    const strictWrite = await t.send('strict write', as('alice'))
    const byBob = await answer(strictWrite, 'approve', 'bob')
    const refusal = byBob.session.events.findLast(event => event.type === 'response.settled')
    t.check(refusal?.data, satisfies(data => (data as { outcome?: string }).outcome === 'refused', 'approval by another user is refused'))
    t.check((await byBob.session.respond([{ interactionId: strictWrite.interactions[0]!.interactionId, optionId: 'approve' }], as('alice'))).reply, includes('4242'))

    // A user who never authorized the App is asked to sign in, and GitHub is not called.
    t.check(kinds(await t.send('strict read', as('erin'))), equals(['sign-in']))

    // A token GitHub rejects sends the user back through sign-in, and the read resumes with the new token.
    const revoked = await t.send('strict read', as('dave'))
    t.check(kinds(revoked), equals(['sign-in']))
    const reconnected = await completeSignIn(t, revoked)
    t.check(reconnected.requireToolCall('strict__getRepository').status, equals('completed'))

    const calls = await t.send('github calls', as('alice'))
    t.check(JSON.parse(calls.reply ?? '[]'), equals([
      'GET /repos/vercel-labs/github-tools ghs_app',
      'GET /repos/vercel-labs/github-tools ghs_app',
      'GET /repos/vercel-labs/github-tools ghu_alice',
      'POST /repos/vercel-labs/github-tools/issues ghu_bob',
      'POST /repos/vercel-labs/github-tools/issues ghu_carol',
      'POST /repos/vercel-labs/github-tools/issues/1/comments ghs_app',
      'POST /repos/vercel-labs/github-tools/issues ghu_alice',
      'GET /repos/vercel-labs/github-tools ghu_revoked',
      'GET /repos/vercel-labs/github-tools ghu_dave',
    ]))
  },
})
