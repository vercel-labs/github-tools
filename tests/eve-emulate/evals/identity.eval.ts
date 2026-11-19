import { defineEval } from 'eve/evals'
import { equals, includes } from 'eve/evals/expect'
import { as } from '@github-tools/eve-extension/testing'
import type config from './evals.config'

export default defineEval<typeof config>({
  description: 'a tool call runs with the GitHub token of the person who asked, and a reader is refused',
  async test(t) {
    const { github } = t.context
    const web = github.repo('acme/web')
    const issue = await web.as('bob').createIssue({ title: 'Crash on save' })

    // alice has Write: the call she approves runs with her token and labels the issue.
    const asked = await t.send(`label acme/web#${issue.number}`, as('alice'))
    await t.require(asked.interactions.map(interaction => interaction.request.kind), equals(['approval']))
    const approved = await asked.session.respond([{ interactionId: asked.interactions[0]!.interactionId, optionId: 'approve' }], as('alice'))
    t.check(approved.requireToolCall('github__addLabels').status, equals('completed'))
    t.check((await web.issue(issue.number)).labels, equals(['bug']))

    // bob has Read: GitHub refuses the same call with his token, and the issue stays as it was.
    const other = await web.as('alice').createIssue({ title: 'Typo in the docs' })
    const refused = await t.send(`label acme/web#${other.number}`, as('bob'))
    const answered = await refused.session.respond([{ interactionId: refused.interactions[0]!.interactionId, optionId: 'approve' }], as('bob'))
    answered.calledTool('github__addLabels', { status: 'failed', count: 1 })
    t.check(answered.reply, includes('github_tools.FORBIDDEN'))
    t.check((await web.issue(other.number)).labels, equals([]))

    // Evals share the emulator's log, so only this eval's two issues are read from it.
    const paths = [issue.number, other.number].map(number => `/repos/acme/web/issues/${number}/labels`)
    const labeling = github.requests.filter(request => request.method === 'POST' && paths.includes(request.path))
    t.check(labeling.map(request => `${request.path} ${request.actor} ${request.status}`), equals([
      `/repos/acme/web/issues/${issue.number}/labels alice 200`,
      `/repos/acme/web/issues/${other.number}/labels bob 403`,
    ]))
  },
})
