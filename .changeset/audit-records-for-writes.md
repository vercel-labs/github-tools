---
'@github-tools/eve-extension': minor
'@github-tools/sdk': minor
---

Add audit records for GitHub writes in eve.

Pass a function as `audit` in the extension's mount file. It receives a plain record of each GitHub write, so no logging library is needed:

```ts
export default githubExtension({
  connector: 'github/my-connector',
  requireApproval: 'auto',
  audit: record => db.upsert('github_audit', record.id, record),
})
```

- **Two records for each write.** A write that reaches GitHub has a `started` record, sent immediately before the request, and a `settled` record with the `outcome`: `succeeded`, `failed`, or `denied`. Both have the same `id`.
- **No write without a record.** The write waits for the function. When it throws on the `started` record, the write isn't sent and the call fails with the new `github_tools.AUDIT_UNAVAILABLE` error. Reads keep working.
- **Stopped writes are recorded too.** A write that `guardrails`, an approval policy, or a person stopped has one `settled` record with `outcome: 'denied'` and the reason.
- **Who and what.** A record names the agent, the requester, the approver or the person who denied the write, the target, what let the write run (`clearance`), the decision model's verdict under `'auto'`, and whether the write used the App's or a person's GitHub access. It holds no title, body, diff, or tool input.
- **Outcomes aren't lost quietly.** A `settled` record the function rejects is written to stderr as one JSON line prefixed `[github-tools] audit`, and sent again with `reconciled: true` each time a turn of the session ends, until the function accepts it.

Reads and dry-run writes have no record, and a mount without `audit` does nothing more than one check for each call. [Observability](https://github-tools.com/observability) lists every field.

In `@github-tools/sdk/eve-runtime`:

- `githubAuditTarget`, `githubAuditStarted`, `githubAuditSettled`, `reconcileGithubAudit`, and `githubAuditRecordId` build the records, with the `GithubAuditRecord` type and its parts.
- `executeGithubEveTool` takes `beforeWrite`, a function awaited immediately before a write's request. A throw from it stops the write.
- `autoApprovalDecision` also returns the decision model's `risk` and `intent` when it answered.
