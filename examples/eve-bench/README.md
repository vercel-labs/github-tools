# eve benchmark for the `'auto'` modes

Compares `@github-tools/eve-extension` configurations on 12 GitHub tasks with [eve evals](https://eve.dev/docs), and replays the evaluation model's routing and approval decisions on fixed cases. Tasks read `vercel-labs/github-tools`; every GitHub write is answered by a local stub (`lib/stub-writes.ts`), so no repository changes.

| `BENCH_CONFIG` | Extension config |
| --- | --- |
| `all` (default) | Full catalog, every write asks |
| `fixed` | `preset: ['code-review', 'issue-triage']` |
| `auto-preset` | `preset: 'auto'` |
| `auto` | `preset: 'auto'`, `requireApproval: 'auto'`: picks single tools once per session |
| `auto-presets` | `auto` with `evaluation.selection: 'presets'`: routes to presets instead |
| `auto-turn` | `auto` with `evaluation.scope: 'turn'`: picks tools again for each request |
| `core-deferred` | `auto` with `maxTools: 0`: only the core read tools are listed, the rest is deferred |
| `cli` | No GitHub tools: eve's bash tool runs the `gh` CLI in a [just-bash](https://eve.dev/docs/sandbox/just-bash) sandbox. Reads run the host's authenticated `gh`, so the token stays outside the sandbox; writes are stubbed by `lib/gh-command.ts` |

`BENCH_LEVEL` (`conservative`, `default`, `permissive`) sets the `evaluation` thresholds, see `lib/configs.ts`.

## Run

Needs `AI_GATEWAY_API_KEY` (agent model and Jev) and `GITHUB_TOKEN` (reads). Set `JEV_GATEWAY_API_KEY` to call Jev with a different Gateway key. The agent disables eve's built-in tools, but eve still prepares a [local sandbox](https://eve.dev/docs/sandbox/default): run Docker, or install `microsandbox`. The `cli` config needs `gh` installed and signed in on the host instead of `GITHUB_TOKEN`.

```bash
pnpm --filter @github-tools/sdk --filter @github-tools/eve-extension build
cd examples/eve-bench

BENCH_CONFIG=all npx eve eval --skip-report
BENCH_CONFIG=auto npx eve eval --skip-report

pnpm decisions # routing and approval accuracy per level, writes .eve/bench/decisions.json
pnpm report    # aggregates every run into .eve/bench/report.md
```

`npx eve eval conversation` runs six different requests in one session instead of the 12 single-turn tasks, to measure prompt caching across turns (`npx eve eval tasks` runs only the single-turn tasks).

`pnpm agent-conversation` sends the same six requests to `createGithubAgent` from `@github-tools/sdk` instead of eve, with AI Gateway's automatic prompt caching, and prints cache reads, cache writes and cost per request. `BENCH_CONFIG` is `all` (full catalog), `presets` (`selection: 'presets'`) or `tools` (the default `preset: 'auto'`).

eve allows one dev server per agent, so run configurations one after another. Costs vary 2–4× between runs of the same task; compare token counts for small differences.
