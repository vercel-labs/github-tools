---
'@github-tools/sdk': minor
---

Object-shaped tool results now include `rateLimit` (`remaining`, `limit`, `reset`, `resource`) from the last GitHub response. The field is stripped before the model sees the output. Array-shaped list tools are unchanged. 403/429 errors include remaining/reset in the message.
