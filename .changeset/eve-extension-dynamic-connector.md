---
"@github-tools/eve-extension": minor
---

The `connector` config field now also accepts a `() => string | Promise<string>` resolver, not just a static connector name, so a mounted extension can pick its Vercel Connect connector dynamically (e.g. per environment or tenant).
