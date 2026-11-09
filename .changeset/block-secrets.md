---
'@github-tools/sdk': minor
'@github-tools/eve-extension': minor
---

Block calls whose input contains a credential, so an agent can't post one to GitHub. The check runs on every tool call by default, even without `guardrails`, and recognizes GitHub, npm, Slack, Stripe, Anthropic, OpenAI, Google and AWS keys, and private keys. A blocked call fails with `github_tools.GUARDRAIL_BLOCKED`, for example "The input contains what looks like a GitHub token. Never send credentials to GitHub; remove it and try again."

`createGithubAgent` and the eve extension deny such a write instead of asking anyone. `createGithubTools` skips the approval request when `guardrails` are set, and otherwise asks before the call fails. Set `guardrails: { secrets: 'allow' }` when the agent has to write fake keys, for example in test fixtures.
