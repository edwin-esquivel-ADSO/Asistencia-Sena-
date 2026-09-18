# 05 — Architecture

> [!NOTE] INSTRUCTIONS
> Read this before filling in any document in this section.
> Delete this block once every document in the section is complete.

## Purpose

This section decides the internal shape of the single deployable: whether it is
organized as modules with enforced boundaries or as flat layers, what each part
owns, and how that shape is kept honest by a check in the build.

## Documents

| Document | Answers | Priority |
|---|---|---|
| [modular-monolith.md](./modular-monolith.md) | What is a modular monolith, and when does it apply? | ⭐ |
| [layered-architecture.md](./layered-architecture.md) | When are flat layers enough, and how are they done well? | ⭐ |
| [module-structure.md](./module-structure.md) | What does the folder tree look like? | ⭐ |
| [boundary-enforcement.md](./boundary-enforcement.md) | How does the build stop one module reaching into another's internals? | ⭐ |
| [decisions/README.md](./decisions/README.md) | How is an architectural decision recorded? | ⭐ |
| [decisions/_template-adr.md](./decisions/_template-adr.md) | Template — copy it once per decision | — |

## Out of scope

This section shapes the inside of **one deployable, one database, one release
pipeline**. Every division it describes — modules, layers, boundaries, folders —
is internal to a single build artifact that ships as a unit.

The following are permanently out of scope here. They are not deferred work
waiting for a later release: splitting the application into independently
deployed units, communication between separately deployed processes, per-module
versioning and release pipelines, microservices, service mesh, API gateway,
service discovery, saga orchestration, circuit breaker, and distributed
transaction coordination.

The growth path this framework documents runs from flat layers **to** the
modular monolith, and stops there. A module is a bounded context inside the
deployable, never a unit awaiting extraction. Distributed-system concerns
belong to the [microservices governance framework](https://github.com/jesusarielgb-works/microservices-governance-framework).

## Ready when

- [ ] Every document in this section has its INSTRUCTIONS block removed
- [ ] `ADR-001` is recorded as `Accepted`, or superseded by a numbered ADR in `decisions/records/`
- [ ] One of modules or flat layers is chosen in writing, and the chosen document lists this project's own modules or layers
- [ ] Every module this project adopts is spelled the same way here and in [`module-boundaries.md`](../02-domain/module-boundaries.md), and the framework's illustrative example names are gone
- [ ] The `boundary check` stage described in [`boundary-enforcement.md`](./boundary-enforcement.md) runs on every pull request and fails the build on a violation

---

**Related:** [`../04-requirements/README.md`](../04-requirements/README.md) · [`../09-modules/README.md`](../09-modules/README.md)
