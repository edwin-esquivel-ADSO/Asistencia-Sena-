# 13 — Operations

> [!NOTE] INSTRUCTIONS
> Read this before filling in any document in this section.
> Delete this block once every document in the section is complete.

## Purpose

This section defines how the one running application makes its own state
observable, and what whoever is on call does when it fails — for a single
process, not a fleet of them.

## Documents

| Document | Answers | Priority |
|---|---|---|
| [observability.md](./observability.md) | How is it known what is happening inside the process? | ⭐ |
| [runbook.md](./runbook.md) | What is done when something fails? | ⭐ |
| [_template-incident.md](./_template-incident.md) | Template — copy it once per incident | — |

## Out of scope

Distributed tracing across services, per-service dashboards or on-call
rotations, a service mesh's own telemetry, and any circuit breaker or saga
compensation between services. This application is one process: a
correlation id already ties a request to the module boundaries it crossed,
and there is no second process to trace into.

Distributed-system concerns belong to the [microservices governance framework](https://github.com/jesusarielgb-works/microservices-governance-framework).

## Ready when

- [ ] Every document in this section has its INSTRUCTIONS block removed
- [ ] `runbook.md`'s symptom table has at least one row for every module in [`../09-modules/module-catalog.md`](../09-modules/module-catalog.md)
- [ ] The **NFR-10** support drill described in `runbook.md` has been run at least once, timed, and logged

---

**Related:** [`../09-modules/README.md`](../09-modules/README.md) · [`../10-devops/README.md`](../10-devops/README.md)
