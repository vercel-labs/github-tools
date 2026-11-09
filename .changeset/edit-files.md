---
'@github-tools/sdk': minor
'@github-tools/eve-extension': minor
---

Add `editFiles`, a write tool that changes files and commits them in one call. Each edit either replaces an exact piece of text, so the agent reads only the part it changes and never resends a whole file to fix a line, or writes a whole file. It creates the branch from `baseBranch` (the default branch unless set) when it doesn't exist, commits every edit in one signed commit, and opens a pull request when you pass `pullRequest`:

```ts
editFiles({
  owner: 'vercel', repo: 'ai', branch: 'docs/wording', message: 'docs: reword the intro',
  edits: [{ path: 'README.md', find: 'A typed tool layer', replace: 'A typed toolkit' }],
  pullRequest: { title: 'docs: reword the intro' },
})
```

`find` must match exactly once; otherwise nothing is written and the error says whether the text was missing or ambiguous. To change more files later, call `editFiles` again on the same `branch`: the new commit lands on the open pull request, and passing `pullRequest` again returns that pull request (`existing: true`) instead of failing. Like `createOrUpdateFile`, it takes `author`, `committer` and `coAuthors`; a custom author or committer commits through the REST API, one commit per file. It's in the `pr-author` and `maintainer` presets, requires approval by default, and its Connect scopes are `contents:write` and `pull_requests:write`.
