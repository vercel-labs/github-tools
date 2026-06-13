---
"@github-tools/sdk": minor
---

Add Eve framework support via a new `@github-tools/sdk/eve` subpath and a scaffold CLI.

- `toEveTool()` adapts any tool from this SDK to Eve's `defineTool` shape; `needsApproval: true` maps to Eve's `always()` predicate, and the adapter accepts Eve predicates (`once()`, custom) as an override
- `githubToken()` resolves the GitHub token from an argument or `GITHUB_TOKEN`
- New `github-tools eve` CLI (`npx @github-tools/sdk eve --preset code-review`) scaffolds one-liner Eve tool files into `agent/tools/`, with `--preset`, `--tools`, `--all`, `--dir`, `--force`, and `--list` flags
- `eve` is a new optional peer dependency; the `ai` peer range now also accepts v7 canaries (Eve pins one)
- New public exports: `GITHUB_TOOL_NAMES`, `GITHUB_WRITE_TOOL_NAMES`, `PRESET_TOOLS`, and the `GithubToolName` type
