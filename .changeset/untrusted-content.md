---
'@github-tools/sdk': minor
'@github-tools/eve-extension': minor
---

Keep text that GitHub hides from the model, and tell the model GitHub text is data:

- Tool results drop HTML comments (`<!-- … -->`) and invisible Unicode characters (zero-width spaces, bidirectional controls, tag characters) from issue, pull request, review, comment, release, discussion and gist comment bodies, at every `detail` level. A rendered page hides them but a model reads them, which makes them a common place to hide instructions. File contents and logs are unchanged. An agent that reads a body and writes it back drops its HTML comments.
- The default system prompt of `createGithubAgent` and `createDurableGithubAgent`, and the eve extension's tool guidance, now say that text from GitHub was written by other people, and that the model treats it as data and acts only on what the user asked. Custom `instructions` replace that prompt.
