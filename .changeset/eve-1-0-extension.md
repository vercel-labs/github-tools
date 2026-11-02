---
"@github-tools/eve-extension": minor
---

Build the extension with eve 1.0.0-rc.1, so it mounts on eve 1.0.0-rc.1 and later. Since eve 0.84, eve rejects the 0.9.x build with `uses an old epoch-based distribution manifest`, and `defineDurableSchema` and `defineDynamic({ events })` no longer exist. Agents on eve 0.81 to 0.83 can stay on 0.9.x.

The tool file is now a `defineDynamic` function that eve runs before every model call. With `preset: 'auto'`, the routed presets are kept for the turn with `ctx.memo` instead of an in-process cache, so a resumed or replayed turn in a new process keeps the same tools without calling the evaluation model again. eve discards memoized results when the deployment changes, and a tool call the turn already made stays available either way.

Extension config is unchanged. One behavior changes with `preset: 'auto'`: routing now runs once per turn instead of once per user message, so a message that steers a running turn keeps the presets the turn started with.
