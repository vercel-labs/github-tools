---
'@github-tools/sdk': minor
'@github-tools/eve-extension': minor
---

Add read tools for the security alerts GitHub already tracks, in the `security-audit` and `maintainer` presets:

- `listCodeScanningAlerts`: code scanning alerts (CodeQL and other tools) with the rule, severity, and the file and line of the latest instance.
- `listDependabotAlerts`: vulnerable dependencies with the package, the advisory (GHSA and CVE IDs, severity, summary), the vulnerable range and the first patched version. This endpoint pages with cursors: pass `nextCursor` as `after`.
- `listSecretScanningAlerts`: leaked credentials with the secret type, whether the secret is still valid, and whether push protection was bypassed. The tool asks GitHub to hide the secret and never returns it.

They need the "Code scanning alerts", "Dependabot alerts" and "Secret scanning alerts" read permissions (the `security_events` scope on a classic token). Their Connect scopes are `security_events:read`, `vulnerability_alerts:read` and `secret_scanning_alerts:read`.
