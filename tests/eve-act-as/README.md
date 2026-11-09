# eve act-as eval

Mounts the built `@github-tools/eve-extension` twice and drives it with `eve eval`:

- `agent/extensions/github.ts`: `actAs: 'caller'` with `approvers: 'anyone'`
- `agent/extensions/strict.ts`: `actAs: 'user'` with the default approvers
- `agent/extensions/gated.ts`: `actAs: 'app'` with a configured `response` policy and a `pullNumber` context

`fixtures/stubs.ts` answers Vercel Connect and `api.github.com` in-process, including the Connect sign-in. `agent/channels/eve.ts` signs in the user named by the `x-eval-user` header. The run needs no token, network, or AI Gateway credentials.

The eval checks that:

- a scheduled turn and a `localDev()` turn run as the App with `'caller'`
- a signed-in user's calls run with their own GitHub token
- a reader who approves their own write gets GitHub's `403`
- anyone can deny without signing in
- a maintainer who approves a reader's write signs in first, and the write runs with the maintainer's token
- an `'app'` tool still needs a signed-in approver, and the approved call runs as the App
- with `'user'`, a session with no signed-in user fails instead of using the App token
- with the default approvers, another user cannot approve
- a user who never authorized the App gets a sign-in prompt, and a user whose token GitHub rejects signs in again and the call resumes
- a configured `response` policy that rejects the requester refuses their approval, and the approver it allows runs the write
- the approval prompt names the issue a call updates, not the pull request in the context

```bash
pnpm --filter @github-tools/sdk --filter @github-tools/eve-extension build
pnpm --filter @github-tools/eve-act-as-test test
```
