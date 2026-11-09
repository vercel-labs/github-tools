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
    t.check(tools.has('github__addLabels'), satisfies(value => value === true, 'picked tools are registered'))
    t.check(tools.has('github__mergePullRequest'), satisfies(value => value === false, 'tools that were not picked are not listed'))
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

    // A successful write's label names what it created.
    t.eventsSatisfy('completed write label', events => JSON.stringify(events).includes('Created issue on vercel-labs/github-tools#4242'))

    const remembered = await afterApprove.session.send('write')
    t.check(remembered.interactions.length, satisfies(value => value === 0, "'once' approval is remembered for the session"))
    t.check(remembered.reply, includes('4242'))

    // A write that fails returns { error }, so its label must not claim success.
    const failed = await remembered.session.send('failing write')
    t.check(failed.reply, includes('error'))
    t.eventsSatisfy('failed write label', events => JSON.stringify(events).includes("Couldn't create issue on vercel-labs/missing"))

    // Guardrails deny a write outside the allowed repositories with the reason, before anyone is asked,
    // even though `createIssue` was approved for the session.
    const outside = await failed.session.send('outside write')
    t.check(outside.interactions.length, satisfies(value => value === 0, 'a write the guardrails block asks no one'))
    t.check(outside.reply, includes('`vercel/next.js` is outside the repositories these tools may act on'))

    // A mount with `dryRun` answers writes without reaching GitHub or asking anyone. The result says
    // approval would have asked, and the label says what would have happened.
    const dryRun = await outside.session.send('dry-run write')
    t.check(dryRun.interactions.length, satisfies(value => value === 0, 'a dry-run write asks no one'))
    t.check(dryRun.reply, includes('"dryRun":true'))
    t.check(dryRun.reply, includes('"approval":{"required":true}'))
    const dryRunDenied = await dryRun.session.send('dry-run denied write')
    t.check(dryRunDenied.interactions.length, satisfies(value => value === 0, 'a denied dry-run write asks no one'))
    t.check(dryRunDenied.reply, includes('Labels are managed by hand.'))
    t.check(dryRunDenied.reply?.includes('"dryRun":true'), satisfies(value => value === false, 'a denied dry-run write returns no dry-run result'))
    t.eventsSatisfy('dry-run write label', events => JSON.stringify(events).includes('Would create issue on vercel-labs/github-tools'))

    // A tool that was not picked is deferred: the model can still call it through eve__tool.
    const deferred = await remembered.session.send('deferred read')
    t.check(deferred.requireToolCall('github__listBranches').status, equals('completed'))
    t.check(deferred.reply, includes('abc123'))

    // The extension adds its tool guidance to the system prompt.
    const instructions = await deferred.session.send('instructions')
    t.check(instructions.reply, includes('getCiFailureContext'))
    t.check(instructions.reply, includes('eve__search'))

    const later = await deferred.session.send('tools')
    t.check(listedTools(later.reply).has('github__addLabels'), satisfies(value => value === true, 'routing holds on later turns'))

    // Ten turns including this one, and the read and write turns make a second model call after
    // their tool result. All of them reuse the session's first routing.
    const routing = await later.session.send('routing')
    t.check(Number(routing.reply), satisfies(value => value === 1, 'routing runs once per session, not once per turn or model call'))

    // On eve's GitHub channel, the thread fills `context`: the model leaves out owner and repo,
    // and the system prompt names the thread. This starts a new session, so it runs after the routing count.
    const fromThread = { headers: { 'x-eval-github': 'vercel-labs/github-tools#12' } }
    const thread = await t.send('thread read', fromThread)
    t.check(thread.requireToolCall('github__getRepository').status, equals('completed'))
    t.check(thread.reply, includes('stubbed-repo'))
    const threadInstructions = await thread.session.send('instructions', fromThread)
    t.check(threadInstructions.reply, includes('vercel-labs/github-tools'))
  },
})
