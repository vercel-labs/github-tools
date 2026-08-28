---
"@github-tools/sdk": patch
---

Internal refactor: introduce `GITHUB_TOOL_CATALOG` as the single source of truth for tool metadata. `GITHUB_TOOL_NAMES`, `GITHUB_WRITE_TOOLS`, `TOOL_CONNECT_SCOPES`, and the eve tool registry are now derived from it instead of being maintained as parallel hand-written registries. No public API changes.
