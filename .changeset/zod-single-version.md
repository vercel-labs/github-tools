---
'@github-tools/eve-extension': patch
---

The extension now depends on `zod@^4.6.7`. Earlier versions allowed `^4.5.4`, so a project that resolved `ai` and `eve` to zod 4.6 could install a second zod copy for the extension, and `eve build` failed type-checking when a schema from one copy reached an API typed against the other.
