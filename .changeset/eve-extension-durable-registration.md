---
'@github-tools/sdk': patch
'@github-tools/eve-extension': patch
---

Fix eve durable tool registration so consumers can drop pnpm patches: rebuild options per execute (no module-level race), resolve tools on `step.started`, and omit the `approval` field for `false` / `'never'` instead of attaching `never()`. Also map `listIssueComments` in Connect tool scopes.
