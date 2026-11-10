import { defineEval, type EveEvalContext, type EveEvalTurn } from 'eve/evals'
import { equals, includes, satisfies } from 'eve/evals/expect'

const as = (user: string) => ({ headers: { 'x-eval-user': user } })
const commenting = (login: string) => ({ headers: { 'x-eval-commenter': login } })

function answer(turn: EveEvalTurn, optionId: 'approve' | 'deny', user: string | ReturnType<typeof commenting>) {
  return turn.session.respond([{ interactionId: turn.interactions[0]!.interactionId, optionId }], typeof user === 'string' ? as(user) : user)
}

// An `issue_comment` webhook as GitHub sends it to the channel route.
function postComment(t: EveEvalContext, id: number, login: string, body: string) {
  const sender = { login, id, type: 'User' }
  return t.target.fetch('/eve/v1/github', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-github-event': 'issue_comment', 'x-github-delivery': `delivery-${id}` },
    body: JSON.stringify({
      action: 'created',
      issue: { number: 7, title: 'eval', state: 'open', user: sender },
      comment: { id, body, user: sender },
      repository: { id: 1, name: 'github-tools', full_name: 'vercel-labs/github-tools', private: false, default_branch: 'main', owner: { login: 'vercel-labs', id: 2, type: 'Organization' } },
      sender,
      installation: { id: 3 },
    }),
  })
}

async function githubCalls(t: EveEvalContext): Promise<string[]> {
  return JSON.parse((await t.send('github calls', as('alice'))).reply ?? '[]')
}

// A webhook is answered before its turn runs, so the calls it leads to show up later.
async function githubCallsOnce(t: EveEvalContext, done: (calls: string[]) => boolean) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const calls = await githubCalls(t)
    if (done(calls)) return calls
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error('The GitHub calls the webhook should lead to never happened.')
}

const isRoleLookup = (call: string) => call.includes('/collaborators/')

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
    // Channels show the call's label instead of the tool name.
    t.check(JSON.stringify(read.events), includes('"label":"Get repository on vercel-labs/github-tools"'))

    // A reader approving their own write gets GitHub's refusal, not the App's access.
    const ownWrite = await t.send('write', as('bob'))
    t.check(ownWrite.interactions.map(interaction => interaction.request.prompt), equals(['Create issue on vercel-labs/github-tools?']))
    const forbidden = await answer(ownWrite, 'approve', 'bob')
    t.check(forbidden.reply, includes('github_tools.FORBIDDEN'))
    // The model gets the failure as an error result, not as a successful output.
    t.check(forbidden.reply, includes('result github__createIssue error'))

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

    // gated (`gated__*`): a configured response policy picks who can answer

    // The policy rejects the requester's own approval, and the approver it allows runs the write as the App.
    const gatedWrite = await t.send('gated write', as('bob'))
    const selfApproved = await answer(gatedWrite, 'approve', 'bob')
    const selfRefusal = selfApproved.session.events.findLast(event => event.type === 'response.settled')
    t.check(selfRefusal?.data, satisfies(data => (data as { outcome?: string }).outcome === 'refused', 'approval rejected by the response policy is refused'))
    t.check((await answer(gatedWrite, 'approve', 'alice')).reply, includes('4242'))

    // The prompt names the issue the call updates, not the pull request in the context.
    const gatedUpdate = await t.send('gated update', as('alice'))
    t.check(gatedUpdate.interactions.map(interaction => interaction.request.prompt), equals(['Update issue on vercel-labs/github-tools#999?']))
    await answer(gatedUpdate, 'deny', 'alice')

    // A commenter on eve's GitHub channel, with `actAs: 'caller'` (`github__*`)

    // GitHub vouches for the commenter but can't sign them in: the call runs as the App, with no sign-in.
    const commenterRead = await t.send('read', commenting('gh-writer'))
    t.check(kinds(commenterRead), equals([]))
    t.check(commenterRead.requireToolCall('github__getRepository').status, equals('completed'))

    // A reader's write is refused for their role once approved, before it reaches GitHub.
    const readerWrite = await t.send('write', commenting('gh-reader'))
    t.check(kinds(readerWrite), equals(['approval']))
    const refused = await answer(readerWrite, 'approve', commenting('gh-reader'))
    t.check(refused.reply, includes('github_tools.CALLER_FORBIDDEN'))
    t.check(refused.reply, includes('gh-reader has read access to vercel-labs/github-tools, and `createIssue` needs write access.'))

    // A writer who approves a reader's write lends their role, without a sign-in.
    const lent = await answer(await t.send('write', commenting('gh-reader')), 'approve', commenting('gh-writer'))
    t.check(kinds(lent), equals([]))
    t.check(lent.reply, includes('4242'))

    // The role is read on the repository a call targets, not the one the thread is in.
    const elsewhere = await t.send('read private', commenting('gh-writer'))
    t.check(elsewhere.reply, includes('gh-writer has no access to vercel-labs/private, and `getRepository` needs read access.'))

    // A write that names no repository is checked on the repository its target is in: a reader can't
    // resolve a review thread by approving their own request, and a writer can.
    const readerResolve = await answer(await t.send('resolve thread', commenting('gh-reader')), 'approve', commenting('gh-reader'))
    t.check(readerResolve.reply, includes('gh-reader has read access to vercel-labs/github-tools, and `resolveReviewThread` needs write access.'))
    const writerResolve = await answer(await t.send('resolve thread', commenting('gh-writer')), 'approve', commenting('gh-writer'))
    t.check(writerResolve.reply, includes('"isResolved":true'))

    // A search is refused while the App's token reaches a repository other than the thread's.
    const search = await t.send('search', commenting('gh-writer'))
    t.check(search.reply, includes('`searchCode` would search every repository the agent\'s token reaches, not only vercel-labs/github-tools'))

    // The GitHub channel with `respondTo: 'writers'`

    // A reader's mention does nothing: their role is read, and no turn starts.
    t.check((await postComment(t, 2001, 'gh-reader', '@eval-agent read this repository')).ok, equals(true))
    await githubCallsOnce(t, calls => calls.some(call => call.includes('/collaborators/gh-reader/')))
    // A writer's mention starts a turn, which reads the thread's repository as the App and replies.
    t.check((await postComment(t, 2002, 'gh-writer', '@eval-agent read this repository')).ok, equals(true))
    const calls = await githubCallsOnce(t, calls => calls.some(call => call.startsWith('POST /repos/vercel-labs/github-tools/issues/7/comments')))

    t.check([...new Set(calls.filter(isRoleLookup))].sort(), equals([
      'GET /repos/vercel-labs/github-tools/collaborators/gh-reader/permission ghs_app',
      'GET /repos/vercel-labs/github-tools/collaborators/gh-writer/permission ghs_app',
      'GET /repos/vercel-labs/private/collaborators/gh-writer/permission ghs_app',
    ]))
    t.check(calls.filter(call => !isRoleLookup(call)), equals([
      'GET /repos/vercel-labs/github-tools ghs_app',
      'GET /repos/vercel-labs/github-tools ghs_app',
      'GET /repos/vercel-labs/github-tools ghu_alice',
      'POST /repos/vercel-labs/github-tools/issues ghu_bob',
      'POST /repos/vercel-labs/github-tools/issues ghu_carol',
      'POST /repos/vercel-labs/github-tools/issues/1/comments ghs_app',
      'POST /repos/vercel-labs/github-tools/issues ghu_alice',
      'GET /repos/vercel-labs/github-tools ghu_revoked',
      'GET /repos/vercel-labs/github-tools ghu_dave',
      'POST /repos/vercel-labs/github-tools/issues ghs_app',
      'GET /repos/vercel-labs/github-tools ghs_app',
      'POST /repos/vercel-labs/github-tools/issues ghs_app',
      // The reader's thread lookup, then the writer's lookup and mutation.
      'POST /graphql ghs_app',
      'POST /graphql ghs_app',
      'POST /graphql ghs_app',
      'GET /installation/repositories ghs_app',
      'POST /repos/vercel-labs/github-tools/issues/comments/2002/reactions ghs_app',
      // The channel reads the repository for its checkout, then the tool reads it.
      'GET /repos/vercel-labs/github-tools ghs_app',
      'GET /repos/vercel-labs/github-tools ghs_app',
      'POST /repos/vercel-labs/github-tools/issues/7/comments ghs_app',
    ]))
  },
})
