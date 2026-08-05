---
"@github-tools/sdk": minor
---

`connectGithubTools` and `connectGithubToken` now accept a `() => string | Promise<string>` resolver in place of a static connector name, re-resolved on every call. Use it to pick a Vercel Connect connector dynamically — e.g. per environment (production vs. preview) or per tenant — instead of hardcoding one connector name.
