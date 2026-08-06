---
"@github-tools/sdk": minor
---

Add discussion, notification, and reaction tools (75 total).

- Discussions (GraphQL): `listDiscussions`, `getDiscussion`, `addDiscussionComment`. `listDiscussions` filters by category name and paginates by cursor (`after` / `endCursor`); `getDiscussion` truncates the body unless `detail: 'full'`. Added to `repo-explorer` (reads) and `maintainer`.
- Notifications: `listNotifications`, `markNotificationRead`. Added to `maintainer`. Notifications are account-level, so they need a PAT with the "Notifications" permission and do not work with a Vercel Connect installation token.
- Reactions: `listIssueReactions`, `addIssueReaction`, `listCommentReactions`, `addCommentReaction`, covering issues, pull request conversations, and their comments. Added to `issue-triage` and `maintainer`. Covered by the existing Issues permission.

`PRESET_CONNECT_SCOPES` now requests `discussions:read` for `repo-explorer` and `discussions:read` / `discussions:write` for `maintainer`.
