# eve smoke test

Mounts the built `@github-tools/eve-extension` in an eve agent and drives it with `eve eval`. A `mockModel` replaces the agent model, a fixed decision model in `fixtures/routing.ts` answers `preset: 'auto'` routing, and `agent/extensions/github.ts` answers `api.github.com` in-process, so the run needs no token, network, or AI Gateway credentials.

The eval checks that the picked tools register and the rest is deferred, a read tool executes, a write tool asks for approval with the input-aware prompt, a denial skips it, a `'once'` approval is remembered for the session, a call GitHub refuses settles as failed and reaches the model as an error result, and routing runs once per session rather than once per turn or model call.

```bash
pnpm --filter @github-tools/sdk --filter @github-tools/eve-extension build
pnpm --filter @github-tools/eve-smoke test
```
