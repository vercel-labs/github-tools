---
"@github-tools/sdk": patch
---

Widen the optional `eve` peer dependency from `>=0.44.0 <0.48.0` to `>=0.44.0`, so `@github-tools/sdk/eve-runtime` and the deprecated `@github-tools/sdk/eve` / `@github-tools/sdk/connect/eve` entry points install against current eve releases without a peer conflict. Verified against eve 0.53.

These entry points keep their existing behavior and stay deprecated in favor of `@github-tools/eve-extension`.
