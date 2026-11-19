import { defineEval } from 'eve/evals'
import { equals } from 'eve/evals/expect'
import { as } from '@github-tools/eve-extension/testing'
import type config from './evals.config'

export default defineEval<typeof config>({
  description: 'a person who has not connected GitHub signs in, and one whose token GitHub rejects signs in again',
  async test(t) {
    const { connect } = t.context
    const kinds = (turn: { interactions: readonly { request: { kind: string } }[] }) => turn.interactions.map(interaction => interaction.request.kind)

    // carol never authorized the App: the read waits for her sign-in, then runs with the token it issued.
    const asked = await t.send('read acme/web', as('carol'))
    await t.require(kinds(asked), equals(['sign-in']))
    const signedIn = await connect.completeSignIn(t, asked)
    t.check(signedIn.requireToolCall('github__getRepository').status, equals('completed'))
    const carol = connect.requests.filter(request => request.body?.subject?.id === 'carol')
    t.check(carol.map(request => `${request.route} ${request.status}`), equals(['token 403', 'authorize 200', 'token 200']))
    t.check(carol[0]?.body?.scopes, equals(['*']))

    // dave is connected, and the agent caches his token. Once it is revoked, GitHub answers 401 and eve asks him to sign in.
    const first = await t.send('read acme/web', as('dave'))
    t.check(first.requireToolCall('github__getRepository').status, equals('completed'))
    connect.revoke('dave')
    const revoked = await t.send('read acme/web', as('dave'))
    await t.require(kinds(revoked), equals(['sign-in']))
    const reconnected = await connect.completeSignIn(t, revoked)
    t.check(reconnected.requireToolCall('github__getRepository').status, equals('completed'))
  },
})
