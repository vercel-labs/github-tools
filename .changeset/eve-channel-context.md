---
'@github-tools/eve-extension': minor
---

On eve's GitHub channel, the extension fills `context` from the thread: the repository, and the issue or pull request number (a pull request's number also fills `issueNumber`, so issue tools work on its thread). The model can leave them out of tool calls, approval prompts and labels name the thread, `guardrails` check the filled-in target, and the system prompt names the thread. Fields set in `context` take precedence, and turns from other channels are unchanged.
