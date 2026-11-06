---
'@github-tools/eve-extension': minor
---

Add `actAs` and `approvers` to choose whose GitHub access each tool call uses.

```ts
export default githubExtension({
  connector: 'github/my-connector',
  actAs: 'caller',
})
```

`actAs` takes:

- `'app'` (default, unchanged): the GitHub App installation token for every caller.
- `'user'`: the signed-in user's own GitHub token. Sessions without a signed-in user fail instead of falling back to the App.
- `'caller'`: the signed-in user when one drives the turn, and the App for turns nobody drives, such as schedules, `localDev()` runs and bots.

Pass `{ read, write }` to pick per tool kind, or `overrides.<tool>.actAs` for one tool. GitHub allows a user-token call only when both the user and the App have access, so the agent can do what the user can do on GitHub and nothing more. A user who has not authorized the App gets an eve sign-in prompt, and the call resumes after it. They are asked again if GitHub rejects their token. A signed-in user never falls back to the App token.

`approvers` takes:

- `'requester'` (default): only the person who asked can answer an approval, so a colleague in a shared thread cannot approve someone else's request.
- `'anyone'`: an opt-in for simple shared agents. Any signed-in user can approve and anyone can deny. For `'user'` and `'caller'` tools, the approved call runs with the approver's GitHub token, so GitHub checks and records the approver. An approver who has not authorized the App signs in before the approval counts. For `'app'` tools the approval is a gate only.

`'user'` and `'caller'` need `connector`, and `connect` cannot be combined with `actAs: 'user'`. The `@vercel/connect` peer dependency now requires `>=2.7.0`, for the `@vercel/connect/eve` helper. The default `actAs` may change to `'caller'` in a future major version.
