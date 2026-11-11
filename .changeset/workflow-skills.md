---
'@github-tools/eve-extension': minor
'@github-tools/sdk': minor
---

Ship workflow skills in the eve extension: procedures the model loads with `eve__skill` when a request matches one.

| Skill | Loads when someone asks to | Requires |
| --- | --- | --- |
| `review-pull-request` | Review a pull request | `getPullRequestContext`, `listPullRequestFiles` |
| `triage-issue` | Triage, label or sort an issue | `getIssueContext`, `searchIssues`, `addLabels` |
| `diagnose-ci` | Explain a failed run or check | `getCiFailureContext` |
| `draft-release-notes` | Say what changed since a release, or prepare notes | `getReleaseContext` |

Each skill says how to do the work and what a finished result contains. Until now, a mount with no `preset` or with `preset: 'auto'` got no guidance for these workflows.

**Skills are on by default, so every mount's system prompt changes on upgrade.** eve lists the name and description of each skill the mount offers, under the mount's prefix (`github__review-pull-request`), and adds its `eve__skill` tool. A skill is offered only when the mount has the tools it requires: `preset: 'code-review'` offers `review-pull-request` alone, and `include: ['createIssue']` offers none. The extension's own instructions are unchanged.

With `preset: 'auto'`, loading a skill lists the tools its procedure names instead of leaving them deferred.

`skills` adds your rules to a procedure, or turns skills off:

```ts
// agent/extensions/github.ts
import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  preset: 'auto',
  skills: {
    'review-pull-request': { additionalInstructions: 'Every behavior change needs a test.' },
    'draft-release-notes': false,
  },
})
```

`additionalInstructions` is added after the built-in procedure, and your rules win when they conflict with one of its steps. `skills: false` turns every skill off. To use a procedure of your own, turn the skill off and write yours under `agent/skills/`.

`@github-tools/sdk/eve-runtime` exports `listGithubSkills({ preset?, include?, exclude?, skills? })`, `GITHUB_SKILLS`, `GITHUB_SKILL_NAMES` and the `GithubSkill`, `GithubSkillName`, `GithubSkillOptions`, `GithubSkillsConfig` and `ResolvedGithubSkill` types.
