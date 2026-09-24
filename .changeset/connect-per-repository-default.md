---
"@github-tools/sdk": minor
"@github-tools/eve-extension": minor
---

Target the GitHub App installation that owns each tool call's repository by default. A GitHub App installed on several accounts now works with `githubExtension({ connector })`, `connectGithubTools` and `connectGithubToken` as they are, with nothing to configure.

- App-subject tokens for a call with `owner` / `repo` (after `context` defaults) get `authorizationDetails: [{ type: 'github_app_installation', org: owner, repositories: [repo] }]`. Static `connect` params merge in. Calls without a repository target and calls outside a tool use the connector's default installation, as before.
- An explicit `installationId`, `authorizationDetails` or `repositories` in the resolved params pins the installation and is never overridden. User subjects (`{ type: 'user' }`) are not targeted: a user token already spans installations.
- Scopes still derive from `preset` / `include` / `exclude`. Connect caches tokens per connector and params, so calls on one repository reuse the token; single-installation connectors resolve to the same installation they used before.
