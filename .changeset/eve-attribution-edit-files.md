---
'@github-tools/eve-extension': minor
'@github-tools/sdk': minor
---

Add the attribution footer to pull requests that `editFiles` opens, and let `attribution.footer` set its text.

With `attribution` on, a call that ran with a person's token added the footer only to `createPullRequest`. A pull request opened by `editFiles` with `pullRequest` got no footer, even though its description tells the model to prefer it over `createPullRequest`. It now gets the footer too.

`attribution.footer` accepts a string or a function that gets the App and returns the line, in addition to `true` and `false`:

```ts
export default githubExtension({
  connector: 'github/my-connector',
  actAs: 'caller',
  attribution: {
    footer: app => `Opened by Evi, through the [${app.slug}](https://github.com/apps/${app.slug}) App.`,
  },
})
```

`withGithubAppFooter(body, bot, footer?)` from `@github-tools/sdk/eve-runtime` takes the line as an optional third argument.
