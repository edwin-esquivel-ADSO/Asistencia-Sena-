# 00 — Security Policy

> [!NOTE] INSTRUCTIONS
> Replace generic tool names with the ones this project actually runs in CI.
> Delete this block once a second person has reviewed it against the pipeline.

This project ships as a single deployable application. Its security controls
apply to one process, one database, and one set of environment variables.

## Secrets management

| Rule | Detail |
|---|---|
| No secret in source control | Enforced by a pre-commit hook and a CI secret scanner |
| Local development | Copy [`../.env.example`](../.env.example) and fill it with local-only values |
| Staging and production | Injected by the deployment platform's secret store, never a committed file |
| Rotation | Every 90 days, or immediately after a suspected leak |

## Dependency scanning

- A CI job scans every pull request for known-vulnerable dependencies before merge.
- A **critical** or **high** severity finding blocks the merge until it is fixed,
  or waived in writing by the tech lead with an expiry date on the waiver.
- Dependencies are upgraded on a monthly cadence even with no known vulnerability.

## Authentication and authorization

- **Authentication:** one identity provider for the whole application; a session
  or token is validated once, at the edge of the request, before any handler runs.
- **Authorization:** role and permission checks live in the domain layer, not in
  the controller — a handler that skips the check is a bug, not a style choice.
- **Least privilege:** the application's own database user cannot `DROP` or
  `ALTER` tables; migrations run under a separate, more privileged role.

## Incident response

A suspected breach is reported to the tech lead within one hour of discovery,
and any secret touched by the incident is rotated before the root cause is
confirmed.

---

**Related:** [`documentation-rules.md`](./documentation-rules.md) · [`README.md`](./README.md)
