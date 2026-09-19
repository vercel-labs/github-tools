---
"@github-tools/eve-extension": patch
---

Rebuild the extension against eve 0.62 and preserve dynamic input and output validation across durable replay. Tool schemas now use `defineDurableSchema` with a serializable tool-name closure, preventing eve 0.59 and newer from rejecting GitHub tools whose Zod schemas were captured through resolver-local descriptors.
