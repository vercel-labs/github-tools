---
"@github-tools/sdk": patch
"@github-tools/eve-extension": patch
---

Make `getIssueContext` return `labelNames` (strings only), default to the full issue body (one-shot, no re-fetch), use fewer comments, slim the `issue-triage` preset (drop redundant `getIssue` / `listLabels`), and tighten agent presets so independent reads run in the same step.
