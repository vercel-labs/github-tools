---
'@github-tools/eve-extension': minor
'@github-tools/sdk': minor
---

The eve extension now adds a system instruction on how to use the GitHub tools: the preset's tool rules, or without a preset the rule to prefer `getPullRequestContext`, `getIssueContext`, `getReleaseContext` and `getCiFailureContext` over chains of single reads, plus the shared rules on paged lists and denied approvals, and the working `context`. It leaves out the presets' "You are …" openers, so your agent keeps its own identity. With `preset: 'auto'`, it also says that other tools can be found with `eve__search`. The text depends only on the extension config, so it doesn't change between model calls.

Write tools now also set eve's `label.complete`, so channels show what a write did once it succeeds, such as "Created issue on vercel/eve#123", instead of keeping the "Create issue on vercel/eve" label.

`@github-tools/sdk/eve-runtime` exports the `resolveToolGuidance({ preset, context })` helper that builds this text.
