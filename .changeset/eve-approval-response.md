---
'@github-tools/eve-extension': patch
---

Honor the `response` policy of an approval object passed in `requireApproval.<tool>` or `overrides.<tool>.approval`. It decides who can answer the approval, and the extension's sign-in checks still apply to the people it allows. The approval prompt now names the target the tool acts on: a `pullNumber` in `context` no longer replaces the issue number of an issue tool.
