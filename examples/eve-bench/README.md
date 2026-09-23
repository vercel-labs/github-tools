# eve benchmark for the `'auto'` modes

Compares `@github-tools/eve-extension` configurations on 12 GitHub tasks with [eve evals](https://eve.dev/docs), and replays the evaluation model's routing and approval decisions on fixed cases. Tasks read `vercel-labs/github-tools`; every GitHub write is answered by a local stub (`lib/stub-writes.ts`), so no repository changes.

| `BENCH_CONFIG` | Extension config |
| --- | --- |
| `all` (default) | Full catalog, every write asks |
| `fixed` | `preset: ['code-review', 'issue-triage']` |
| `auto-preset` | `preset: 'auto'` |
| `auto` | `preset: 'auto'`, `requireApproval: 'auto'` |

`BENCH_LEVEL` (`conservative`, `default`, `permissive`) sets the `evaluation` thresholds, see `lib/configs.ts`.

## Run

Needs `AI_GATEWAY_API_KEY` (agent model and Jev) and `GITHUB_TOKEN` (reads). Set `JEV_GATEWAY_API_KEY` to call Jev with a different Gateway key. The agent disables eve's built-in tools, but eve still prepares a [local sandbox](https://eve.dev/docs/sandbox/default): run Docker, or install `microsandbox`.

```bash
pnpm --filter @github-tools/sdk --filter @github-tools/eve-extension build
cd examples/eve-bench

BENCH_CONFIG=all npx eve eval --skip-report
BENCH_CONFIG=auto npx eve eval --skip-report

pnpm decisions # routing and approval accuracy per level, writes .eve/bench/decisions.json
pnpm report    # aggregates every run into .eve/bench/report.md
```

eve allows one dev server per agent, so run configurations one after another. Costs vary 2–4× between runs of the same task; compare token counts for small differences.
