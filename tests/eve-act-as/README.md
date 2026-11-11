# eve act-as eval

Mounts the built `@github-tools/eve-extension` four times and drives it with `eve eval`:

- `agent/extensions/github.ts`: `actAs: 'caller'` with `approvers: 'anyone'`
- `agent/extensions/strict.ts`: `actAs: 'user'` with the default approvers
- `agent/extensions/gated.ts`: `actAs: 'app'` with a configured `response` policy and a `pullNumber` context
- `agent/extensions/audited.ts`: an `audit` function, with `guardrails`, a decision model for labels, and comments that need no approval

`fixtures/stubs.ts` answers Vercel Connect and `api.github.com` in-process, including the Connect sign-in. `fixtures/audit.ts` answers for `vercel-labs/audited` and keeps its own request log, so the two evals can run at the same time. `agent/channels/eve.ts` signs in the user named by the `x-eval-user` header, or stands in for a GitHub commenter named by `x-eval-commenter`. `agent/channels/github.ts` mounts `githubChannel` from `@github-tools/eve-extension/channels` with `respondTo: 'writers'`, and the eval posts `issue_comment` webhooks to it. The run needs no token, network, or AI Gateway credentials.

`evals/act-as.eval.ts` checks that:

- a scheduled turn and a `localDev()` turn run as the App with `'caller'`
- a signed-in user's calls run with their own GitHub token
- a reader who approves their own write gets GitHub's `403`, and the call settles as failed
- anyone can deny without signing in
- a maintainer who approves a reader's write signs in first, and the write runs with the maintainer's token
- an `'app'` tool still needs a signed-in approver, and the approved call runs as the App
- with `'user'`, a session with no signed-in user fails instead of using the App token
- with the default approvers, another user cannot approve
- a user who never authorized the App gets a sign-in prompt, and a user whose token GitHub rejects signs in again and the call resumes
- a configured `response` policy that rejects the requester refuses their approval, and the approver it allows runs the write
- the approval prompt names the issue a call updates, not the pull request in the context
- with `'caller'`, a GitHub commenter's call runs as the App with no sign-in, a reader's approved write is refused with `CALLER_FORBIDDEN`, a writer who approves it lends their role, and a call to another repository is checked against the role there
- with `'caller'`, a commenter needs Write on a review thread's repository to resolve it, and a search is refused while the App's token reaches another repository
- with `respondTo: 'writers'`, a reader's mention starts no turn, and a writer's mention starts one that reads the thread's repository and replies

`evals/audit.eval.ts` reads the records `fixtures/audit.ts` received and the requests GitHub got for `vercel-labs/audited`, and checks that:

- a read has no record
- a write a second person approves has a `started` and a `settled` record with the same `id`, naming the agent, the requester, and the approver
- a write `guardrails` block and a write a person denies each have one `denied` record, with the reason and, for the denial, who denied it
- a write the decision model lets through carries its verdict
- a write GitHub answers with `403` settles as `failed` with the error code
- a scheduled turn's records have no requester
- when the function rejects a `started` record, GitHub gets no request and the call fails with `AUDIT_UNAVAILABLE`
- an outcome the function rejects during its turn arrives when the session's next turn ends, with `reconciled: true`

```bash
pnpm --filter @github-tools/sdk --filter @github-tools/eve-extension build
pnpm --filter @github-tools/eve-act-as-test test
```
