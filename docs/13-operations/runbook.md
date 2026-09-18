# 13 — Runbook

> [!NOTE] INSTRUCTIONS
> This is the global entry point; keep it routing to module runbooks
> instead of absorbing their diagnosis steps, or the two will drift apart.
> Delete this block once the support drill below has been run for real.

## How this runbook is organized

This file routes a symptom to the module most likely responsible, then
hands off to that module's own runbook — a copy of
[`../09-modules/_template-module/runbook.md`](../09-modules/_template-module/runbook.md)
kept inside that module's own folder under `09-modules/` — for diagnosis
inside that module. This file never diagnoses inside a module; it only
routes, and it recovers the whole application, never one module alone.

## Symptom → likely cause → action

| Symptom | Likely cause | Action |
|---|---|---|
| Invoices stuck, but products look correct | `billing` | Diagnose in `billing`'s own runbook |
| Product prices wrong across the catalog | `catalog` | Diagnose in `catalog`'s own runbook |
| `/health` fails, everything is unreachable | The application process itself | Restart, below |
| Errors spiked right after a deploy | The last release | Rollback, below |

## Startup, shutdown, and rollback

| Procedure | Steps |
|---|---|
| Startup | Load configuration for the target [environment](../10-devops/environments.md); start the one artifact; wait for `/health` to report ready |
| Shutdown | Stop accepting new requests, let in-flight ones finish, then stop the process — there is nothing else to stop |
| Rollback | Redeploy the previous artifact tag through the same [pipeline](../10-devops/ci-cd.md), never a hand-built fix on the running instance; confirm `/health` before declaring it resolved |

There is one process and one release: every action above targets the whole
application, never a single module. **NFR-10** is narrower than this table:
it measures a support question about one invoice, answered from logs alone
in under five minutes, via the `correlationId` lookup in
[`./observability.md`](./observability.md) — not a resolution time for the
outages recovered above.

---

**Related:** [`./observability.md`](./observability.md) · [`../09-modules/README.md`](../09-modules/README.md)
