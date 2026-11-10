---
'@github-tools/eve-extension': minor
'@github-tools/sdk': minor
---

Make an agent on eve's GitHub channel act for the person who commented, and choose who it answers.

**`actAs: 'caller'` now works for people who comment on GitHub.** GitHub identifies a commenter, but a public comment can't carry a sign-in, so a `'caller'` call from one used to stop at "Authorization required". It now runs with the App's token, limited to the commenter's own role:

- Before each call, the extension reads the commenter's role on the repository the call targets. A read needs Read and a write needs Write, so someone who can write to one repository can't have the agent read another one they can't see.
- A refused call fails with `github_tools.CALLER_FORBIDDEN` before it reaches GitHub. The message names the role the person has and the one the call needs.
- A tool without a repository, such as `searchCode`, gets a token for the thread's repository only. `createRepository` and `forkRepository` are refused.
- With `approvers: 'anyone'`, a call another commenter approved is checked against the approver's role.

`'app'` and `'user'` are unchanged, and so are `'caller'` turns from other channels.

**`githubChannel` with `respondTo`.** `@github-tools/eve-extension/channels` exports eve's `githubChannel` with one more option, which limits who can reach the agent with a comment:

```ts
// agent/channels/github.ts
import { connectGitHubCredentials } from '@vercel/connect/eve'
import { githubChannel } from '@github-tools/eve-extension/channels'

export default githubChannel({
  credentials: connectGitHubCredentials('github/my-connector'),
  respondTo: 'writers',
})
```

`respondTo` takes `'anyone'` (default), `'triagers'`, `'writers'`, `'maintainers'` or `'admins'`: GitHub's repository roles, each meaning that role and everyone above it. A comment from someone below it starts no turn, so it leaves no reaction, no session and no model call. Every other option is eve's.

`@github-tools/sdk/eve-runtime` exports what both are built from: `withGithubCallerAccess(token, { login, repository? })`, `githubCallerViolation`, `githubRoleRank` and `GITHUB_ROLES`.
