---
"@github-tools/eve-extension": patch
---

Rebuild the extension against eve 0.53. eve 0.50 changed the dynamic-tool capability contract and requires extensions built against the earlier contract to be rebuilt, so agents on eve 0.50 or newer need this release.

`eve` is now declared as a `*` peer dependency instead of `>=0.44.0 <0.48.0`. The consuming agent supplies the runtime copy of eve, and eve validates the extension's generated capability metadata at build time rather than an npm range, so a new eve release no longer produces a peer conflict. The exact `eve` devDependency is the authoring and build version.

`engines.node` widens from `24.x` to `>=24`. Mount configuration and tool behavior are unchanged.
