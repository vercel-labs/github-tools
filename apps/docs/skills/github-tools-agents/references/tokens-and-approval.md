---
name: tokens-and-approval
description: Guidance on mapping GitHub token scopes to specific tools and configuring approval flows for safe write operations.
tags: [token, PAT, permissions, approval, requireApproval, security, write-safety]
---

# Tokens and approval

## GitHub token

- Prefer **fine-grained PAT** with least privilege per repository.
- Classic PAT: `repo` (private) or `public_repo` (public only) for broad prototyping.

## Mapping permissions to tools

The docs site lists each tool and whether it writes:

- **Contents**: files, branches, repos (read/write as needed).
- **Issues** / **Pull requests**: read vs read-write for create/comment/close/merge.
- **Actions**: workflow runs, dispatch, cancel, rerun.
- **Commit statuses** (write): `createCommitStatus`, in `code-review`, `ci-ops` and `maintainer`. With Vercel Connect the preset's token requests `statuses:write`, so the GitHub App needs it, or leave the tool out with `exclude` (see `/auth#leave-a-tool-out-of-the-token`).
- **Metadata**: enough for `getCollaboratorPermission`.
- **Gists**: read vs write/delete.

See `/reference/tools` and `/auth`.

## `requireApproval` (non-durable)

With `createGithubTools` / `createGithubAgent`:

- Default: writes require user approval in the AI SDK flow.
- `requireApproval: false` disables all write approvals.
- Partial object: `{ mergePullRequest: true, createIssue: false, … }`.

## Guardrails and shadow mode

- `guardrails: { repositories: ['owner/*'], branches: ['agent/*'] }` limits where any call may act, whoever approves it. A blocked call fails with `github_tools.GUARDRAIL_BLOCKED` before reaching GitHub. Credentials in a call's input are blocked by default (`secrets: 'allow'` turns that off). With factories, wrap the token with `withGithubGuardrails`. See `/approval#guardrails`.
- `dryRun: true` runs reads, and each write returns what it would have done instead of reaching GitHub. See `/approval#shadow-mode`.

## Durable agent

`createDurableGithubAgent` pauses the workflow on a write that needs approval until someone answers, and resumes after a restart. It takes `true`, `false` or per-tool booleans; `'auto'` isn't available inside a workflow. See `/integrations/workflow#approval`.

## Doc paths (site)

- `/approval`
- `/auth`
- `/reference/tools`
