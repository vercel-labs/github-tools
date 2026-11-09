# eve auto eval

Mounts the built `@github-tools/eve-extension` with `preset: 'auto'`, `requireApproval: 'auto'` and a Vercel Connect `connector`, and drives it with `eve eval`. `fixtures/evaluation.ts` answers routing and approval questions, and `fixtures/stubs.ts` answers Vercel Connect and `api.github.com` in-process and blocks every other host. The run needs no token, network, or AI Gateway credentials.

The eval checks that:

- each Connect token covers only the tool being called
- a low-risk write the person asked for runs without approval, with `clearedBy: { policy: 'approval' }` on `call.started`
- a service caller always gets an approval prompt
- a risky write's approval prompt gives the evaluation model's verdict
- approving a risky write does not call the evaluation model a second time

```bash
pnpm --filter @github-tools/sdk --filter @github-tools/eve-extension build
pnpm --filter @github-tools/eve-auto-test test
```
