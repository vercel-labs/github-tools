---
"@github-tools/eve-extension": minor
---

Build the extension with eve 0.81.1. The published manifest now requires tool contract 93 and dynamic-tool contract 87, so the extension mounts on eve 0.81 and later. Agents on eve 0.72 to 0.80 can stay on 0.8.x.

Approval requests for write tools now name the action and its target instead of eve's default `Approve <tool>?`, for example `Merge pull request on vercel-labs/github-tools#176?`. `owner`, `repo`, and the pull request, issue, or discussion number fall back to `context` when the call omits them.
