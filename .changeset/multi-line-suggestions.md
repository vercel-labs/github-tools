---
'@github-tools/sdk': minor
---

`createPullRequestReview` comments take `startLine` (and `startSide`) for a comment on a range of lines, with `line` as the last one. A ```` ```suggestion ```` block in such a comment replaces the whole range when the author applies it, so a review can propose a fix that spans several lines. The `code-review` prompt tells the agent to use it.
