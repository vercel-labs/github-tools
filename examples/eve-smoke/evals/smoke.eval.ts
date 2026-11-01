import { defineEval } from 'eve/evals'
import { equals, includes, satisfies } from 'eve/evals/expect'

function listedTools(reply: string | undefined): Map<string, string> {
  return new Map(JSON.parse(reply ?? '[]') as [string, string][])
}

export default defineEval({
  description: 'routes, registers, executes, and approval-gates GitHub tools',
  async test(t) {
    const first = await t.send('tools')
    const tools = listedTools(first.reply)
    t.check(tools.has('github__addLabels'), satisfies(value => value === true, 'routed issue-triage tools are registered'))
    t.check(tools.has('github__mergePullRequest'), satisfies(value => value === false, 'unrouted tools are absent'))
    t.check(tools.get('github__getRepository'), satisfies(value => value === 'Smoke: get repository', 'description override applies'))

    const read = await first.session.send('read')
    const repository = read.requireToolCall('github__getRepository')
    t.check(repository.status, satisfies(value => value === 'completed', 'read tool completes'))
    t.check(JSON.stringify(repository.output), includes('stubbed-repo'))

    const denied = await read.session.send('write')
    const prompts = denied.interactions.map(interaction => interaction.request.prompt)
    t.check(prompts, equals(['Create issue on vercel-labs/github-tools?']))
    const afterDeny = await denied.session.respondAll('deny')
    t.check(afterDeny.reply?.startsWith('result github__createIssue error'), satisfies(value => value === true, 'denied write does not run'))

    const approved = await afterDeny.session.send('write')
    t.check(approved.interactions.length, satisfies(value => value === 1, 'write asks again after a denial'))
    const afterApprove = await approved.session.respondAll('approve')
    t.check(afterApprove.reply, includes('4242'))

    const remembered = await afterApprove.session.send('write')
    t.check(remembered.interactions.length, satisfies(value => value === 0, "'once' approval is remembered for the session"))
    t.check(remembered.reply, includes('4242'))

    const second = listedTools((await remembered.session.send('tools')).reply)
    t.check(second.has('github__addLabels'), satisfies(value => value === true, 'routing holds on later turns'))
  },
})
