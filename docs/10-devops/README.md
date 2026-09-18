# 10 — DevOps

> [!NOTE] INSTRUCTIONS
> Read this before filling in any document in this section.
> Delete this block once every document in the section is complete.

## Purpose

This section describes how the single build artifact moves from a
developer's machine, through one pipeline, into each environment — and
what must hold true at every stage for it to keep moving.

## Documents

| Document | Answers | Priority |
|---|---|---|
| [local-setup.md](./local-setup.md) | How does a new developer start? | ⭐ |
| [ci-cd.md](./ci-cd.md) | How is the artifact built and deployed? | ⭐ |
| [environments.md](./environments.md) | What environments exist, and how do they differ? | ⭐ |

## Out of scope

A per-module pipeline, a deploy order between modules, and a partial or
canary rollout of one module while the rest of the application stays
behind — the application is one artifact and ships as one unit, always.
Also out of scope: microservices, service mesh, API gateway, service
discovery, saga, circuit breaker, and distributed transaction coordination
between independently deployed processes.

Distributed-system concerns belong to the [microservices governance framework](https://github.com/jesusarielgb-works/microservices-governance-framework).

## Ready when

- [ ] Every document in this section has its INSTRUCTIONS block removed
- [ ] The pipeline in `ci-cd.md` runs on every pull request and blocks the merge on any stage failure
- [ ] A developer with none of the prerequisites installed reaches a responding application by following `local-setup.md` alone, inside NFR-08's one-hour budget
- [ ] Every deployed environment in `environments.md` — `staging` and `production` — is reachable only through a stage of the one pipeline in `ci-cd.md`; `local` is the one exception, and the developer deploys it by hand

---

**Related:** [`../05-architecture/README.md`](../05-architecture/README.md) · [`../11-quality/README.md`](../11-quality/README.md)
