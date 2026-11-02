# eve smoke test

Mounts the built `@github-tools/eve-extension` in an eve agent and drives it with `eve eval`. A `mockModel` replaces the agent model, a fixed decision model in `fixtures/routing.ts` answers `preset: 'auto'` routing, and `agent/extensions/github.ts` answers `api.github.com` in-process, so the run needs no token, network, or AI Gateway credentials.

The eval checks that routed tools register, a read tool executes, a write tool asks for approval with the input-aware prompt, a denial skips it, a `'once'` approval is remembered for the session, and routing runs once per turn rather than once per model call.

```bash
pnpm --filter @github-tools/sdk --filter @github-tools/eve-extension build
pnpm --filter @github-tools/eve-smoke test
```
