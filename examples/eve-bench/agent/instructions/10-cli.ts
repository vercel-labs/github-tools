import { defineDynamic, defineInstructions } from 'eve/instructions'

// The `cli` config has no GitHub tools: the agent works through `gh` in its bash tool.
export default defineDynamic(() => process.env.BENCH_CONFIG === 'cli'
  ? defineInstructions({ content: 'There are no GitHub tools here. Use the authenticated `gh` CLI through your bash tool instead (`gh api`, `gh pr`, `gh issue`, `gh run`, `gh release`, `gh search`, with `--json` and `jq` to keep output small).' })
  : null)
