---
'@github-tools/eve-extension': minor
---

Build with eve 1.0.0-rc.6. The extension now mounts on eve 1.0.0-rc.6 or later; upgrade eve before upgrading the extension.

- A failed GitHub call reaches the model as an error result (eve's `error-text` output) instead of a successful JSON output. `call.settled` still carries the full `{ error }` payload.
- While a call runs, channels show the action and its target, such as `Create issue on vercel-labs/github-tools#12`, instead of the tool name.
- Removed the filter for eve's `[Pending approvals]` message, which eve has rendered into the system prompt since 1.0.0-rc.3.
