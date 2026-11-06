---
'@github-tools/eve-extension': minor
---

`preset: 'auto'` now routes once per session, on its first request, instead of on every request. The listed tools stay the same for the rest of the session, so the model provider keeps reading the cached conversation instead of writing it again. In a six-request session with Claude Opus 5.5, per-request routing cost more than twice as much as listing every tool. A later request that needs other tools finds them through `eve__search`, as before.

Set `evaluation: { scope: 'turn' }` to route each new request, as before this release.
