# eve testing entry eval

Runs `@github-tools/eve-extension/testing` end to end: `evals/evals.config.ts` starts the GitHub and Vercel Connect emulators with `emulateGithub`, and a `mockModel` agent mounts the built extension, eve's channel with `evalIdentity()`, and `githubChannel` on `underEmulation(connectGitHubCredentials(...))`. No agent file imports a stub or a redirect. The run needs no token, network, or AI Gateway credentials.

The evals check that:

- a write that a person with Write approves runs with their GitHub token and changes the issue in the emulator
- the same write, approved by a person with Read, is refused by the role guard with `403`, settles as failed, and leaves the issue as it was
- a person who never authorized the App gets a sign-in prompt, and the call resumes with the token the sign-in issued
- a person whose token is revoked gets `401` from the emulator, signs in again, and the call resumes
- a request the emulator didn't sign is refused by the GitHub channel
- with `respondTo: 'writers'`, a reader's mention starts no turn, and a writer's comment, created in the emulator, starts one whose reply is read back from the thread
- an approval on the GitHub channel is answered by a comment
- a comment on a pull request's conversation loads the pull request, and a review comment gets a reply in its thread

`scripts/probe.mjs` then runs the evals with the redirect taken out of `NODE_OPTIONS`, and checks that the run stops before the first eval with the probe's message.

```bash
pnpm --filter @github-tools/sdk --filter @github-tools/eve-extension build
pnpm --filter @github-tools/eve-emulate-test test
```
