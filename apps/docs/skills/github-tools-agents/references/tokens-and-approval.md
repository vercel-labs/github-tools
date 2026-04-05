# Tokens and approval

## GitHub token

- Prefer **fine-grained PAT** with least privilege per repository.
- Classic PAT: `repo` (private) or `public_repo` (public only) for broad prototyping.

## Mapping permissions to tools

The docs site lists each tool and whether it writes:

- **Contents** — files, branches, repos (read/write as needed).
- **Issues** / **Pull requests** — read vs read-write for create/comment/close/merge.
- **Actions** — workflow runs, dispatch, cancel, rerun.
- **Gists** — read vs write/delete.

See `/api/tools-catalog` and `/guide/token-permissions`.

## `requireApproval` (non-durable)

With `createGithubTools` / `createGithubAgent`:

- Default: writes require user approval in the AI SDK flow.
- `requireApproval: false` disables all write approvals.
- Partial object: `{ mergePullRequest: true, createIssue: false, … }`.

## Durable agent caveat

`createDurableGithubAgent` **accepts** `requireApproval` but does **not** enforce interactive approval today. Treat durable paths as **high-trust** or avoid passing destructive tools until Workflow supports the same pattern.

## Doc paths (site)

- `/guide/approval-control`
- `/guide/token-permissions`
