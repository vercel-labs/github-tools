---
'@github-tools/eve-extension': minor
'@github-tools/sdk': minor
---

Add the attribution footer to pull requests that `editFiles` opens, and let `attribution.footer` take a template.

With `attribution` on, a call that ran with a person's token added the footer only to `createPullRequest`. A pull request opened by `editFiles` with `pullRequest` got no footer, even though its description tells the model to prefer it over `createPullRequest`. It now gets the footer too.

`attribution.footer` accepts a template whose tokens the extension fills from each call: `{app}` (the App as a link), `{app.name}`, `{requester}` (`@<login>` of the person whose token runs the call) and `{channel}` (such as `slack` or `github`). An unknown token fails when the extension mounts. A function that gets the App and returns the line also works.

```ts
export default githubExtension({
  connector: 'github/my-connector',
  actAs: 'caller',
  attribution: { footer: 'Opened by Evi in {channel} for {requester}, through {app}.' },
})
```

`@github-tools/sdk/eve-runtime` exports `fillGithubFooter`, `githubFooterTokens`, `githubAppFooterValues`, `githubLogin`, `GITHUB_FOOTER_TOKENS` and `DEFAULT_GITHUB_FOOTER`, and `withGithubAppFooter(body, bot, footer?)` takes the filled line as an optional third argument.
