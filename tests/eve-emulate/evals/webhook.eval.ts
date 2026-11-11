import { defineEval } from 'eve/evals'
import { equals, includes, satisfies } from 'eve/evals/expect'
import type config from './evals.config'

export default defineEval<typeof config>({
  description: 'a comment created in the emulator reaches the agent as a signed webhook, and the reply is read back',
  async test(t) {
    const { github } = t.context
    const web = github.repo('acme/web')
    const mention = `@${github.app.slug} read this repository`
    await github.deliverWebhooksTo(t)

    // The channel checks the emulator's signature, so a request it didn't sign is refused.
    const forged = await t.target.fetch('/eve/v1/github', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-github-event': 'issue_comment', 'x-github-delivery': 'forged', 'x-hub-signature-256': 'sha256=00' },
      body: JSON.stringify({ action: 'created' }),
    })
    t.check(forged.status, equals(401))

    // An issue: bob has Read, so his mention starts nothing, and alice's starts a turn that replies.
    const issue = await web.as('bob').createIssue({ title: 'Crash on save' })
    await web.as('bob').comment(issue.number, mention)
    const asked = await web.as('alice').comment(issue.number, mention)
    const reply = await web.issue(issue.number).waitForComment({ by: 'app' })
    t.check(reply.body, includes('result github__getRepository ok'))
    t.check(reply.body, includes('acme/web'))
    t.check((await web.issue(issue.number).comments()).filter(comment => comment.author === `${github.app.slug}[bot]`).length, equals(1))
    t.check(github.requests.some(request => request.path === `/repos/acme/web/issues/comments/${asked.id}/reactions` && request.status === 201), equals(true))

    // An approval on GitHub is a comment, and a reply that mentions the agent answers it.
    const unlabeled = await web.as('bob').createIssue({ title: 'Needs a label' })
    await web.as('alice').comment(unlabeled.number, `@${github.app.slug} label this issue`)
    const prompt = await web.issue(unlabeled.number).waitForComment({ by: 'app' })
    t.check(prompt.body, includes('Add labels on acme/web'))
    await web.as('alice').comment(unlabeled.number, `@${github.app.slug} Approve`)
    const labeled = await web.issue(unlabeled.number).waitForComment({ by: 'app', after: prompt.id })
    t.check(labeled.body, includes('result github__addLabels ok'))
    t.check((await web.issue(unlabeled.number)).labels, equals(['bug']))

    // A pull request's conversation: the payload names the pull request, so the channel loads it.
    const pull = await web.as('alice').createPullRequest({ title: 'Fix the crash' })
    await web.as('alice').comment(pull.number, mention)
    await web.pull(pull.number).waitForComment({ by: 'app' })
    t.check(github.requests.some(request => request.path === `/repos/acme/web/pulls/${pull.number}` && request.actor === `${github.app.slug}[bot]`), equals(true))

    // A review comment on the diff: the agent reacts to it and replies in its thread.
    const octokit = github.octokit('alice')
    const { data: review } = await octokit.rest.pulls.createReviewComment({ owner: 'acme', repo: 'web', pull_number: pull.number, body: mention, commit_id: pull.headSha, path: `${pull.head}.txt`, line: 1, side: 'RIGHT' })
    await t.require(review.id, satisfies(id => typeof id === 'number', 'the review comment was created'))
    let threadReply: { in_reply_to_id?: number } | undefined
    for (let attempt = 0; attempt < 300 && !threadReply; attempt++) {
      const { data: comments } = await octokit.rest.pulls.listReviewComments({ owner: 'acme', repo: 'web', pull_number: pull.number })
      threadReply = comments.find(comment => comment.user?.login === `${github.app.slug}[bot]`)
      if (!threadReply) await t.sleep(100)
    }
    t.check(threadReply?.in_reply_to_id, equals(review.id))

    const fromPeople = github.deliveries.filter(delivery => (delivery.payload as { sender?: { type?: string } }).sender?.type === 'User')
    t.check(fromPeople.every(delivery => delivery.status_code === 200), equals(true))
  },
})
