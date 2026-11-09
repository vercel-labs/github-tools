---
'@github-tools/eve-extension': patch
---

A GitHub tool call that fails no longer gets a success label in channels. Failed calls return `{ error }` instead of throwing, so eve still ran the completion label, and a failed `createIssue` showed "Created issue on owner/repo". It now shows "Couldn't create issue on owner/repo".
