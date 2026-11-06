---
'@github-tools/sdk': patch
'@github-tools/eve-extension': patch
---

Remove dead code and fix package metadata. No behavior change.

- `PRESET_TOOLS` is checked with `satisfies`, so a misspelled tool name in a preset fails to compile. The `AssertValidPresetTools` type, which never caught one, is removed.
- eve tool calls build the registry entry for the called tool only, instead of all 84 tools on every call.
- The eve extension derives its `preset` config enum from `PRESET_TOOLS`.
- `package.json` declares `"sideEffects": false` instead of an entry that matched no file, and its `author` field is fixed.
