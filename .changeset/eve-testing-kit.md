---
'@github-tools/eve-extension': minor
---

Test an eve agent without GitHub.

`@github-tools/eve-extension/testing` runs an agent's evals against a local GitHub emulator, [`vercel-labs/emulate`](https://github.com/vercel-labs/emulate), and a Vercel Connect emulator. An eval creates an issue as one person, asks the agent as another, and reads the result back. No request reaches `api.github.com` or `api.vercel.com`, so an eval needs no GitHub token and makes no real write.

```ts
// evals/evals.config.ts
import { defineEvalConfig } from 'eve/evals'
import { emulateGithub } from '@github-tools/eve-extension/testing'

export default defineEvalConfig({
  setup: () => emulateGithub({
    repositories: { 'acme/web': { labels: ['bug'] } },
    people: { alice: { role: 'write' }, bob: { role: 'read' } },
  }),
  teardown: context => context?.close(),
})
```

```ts
// evals/triage.eval.ts
const web = t.context.github.repo('acme/web')
const issue = await web.as('bob').createIssue({ title: 'Crash on save' })

const turn = await t.send(`Triage acme/web#${issue.number}`, as('alice'))

turn.calledTool('github__addLabels')
t.check((await web.issue(issue.number)).labels, includes('bug'))
```

What it adds:

- **All 97 tools run against the emulator.** The package adds what emulate 0.13.1 lacks: the REST routes and GraphQL queries the tools call, and the role checks GitHub makes for a personal token. A reader's label or merge is refused with `403`, and the labels a reader sends with a new issue are dropped, as on GitHub.
- **Named people.** Each person is a GitHub user with a role and the eve principal of the same name. `as('alice')` sends a message or answers an approval as her, and `evalIdentity()` from `@github-tools/eve-extension/testing/agent` names the caller in the eve channel's auth. It accepts nothing outside a local eve server.
- **Vercel Connect.** App tokens are narrowed to the scopes the mounted tools ask for, a person with `authorized: false` signs in first, and `t.context.connect.revoke(person)` invalidates their token.
- **The GitHub channel.** After `t.context.github.deliverWebhooksTo(t)`, a comment an eval creates reaches the agent as a signed webhook, and `waitForComment` reads the reply. `underEmulation()` adapts `connectGitHubCredentials` for the run.

Install `@emulators/core@0.13.1` and `@emulators/github@0.13.1` as development dependencies to use it. Nothing changes for an agent that doesn't. See [Test an agent](https://github-tools.com/guides/test-an-agent).
