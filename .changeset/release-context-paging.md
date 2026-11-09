---
'@github-tools/sdk': patch
---

`getReleaseContext` now finds the previous release when the release, or the one before it, isn't among the 30 most recent. It pages through up to 1,000 releases; pass `previousTag` for an older one.
