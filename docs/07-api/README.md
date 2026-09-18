# 07 — API

> [!NOTE] INSTRUCTIONS
> Read this before filling in any document in this section.
> Delete this block once every document in the section is complete.

## Purpose

This section specifies the single public API this application exposes to
its clients: resource naming, versioning, status codes, error shape and
pagination, plus the contract template a new resource group starts from.

## Documents

| Document | Answers | Priority |
|---|---|---|
| [rest-conventions.md](./rest-conventions.md) | What does the application's public API look like? | ⭐ |
| [contracts/openapi/_template-api.yaml](./contracts/openapi/_template-api.yaml) | Template — copy it once per resource group this API exposes | — |

## Out of scope

An API gateway, service mesh or service discovery layer, per-module API
versioning, contracts between independently deployed services, and any
consistency pattern — circuit breakers, sagas — needed only because a
client calls more than one deployable. This application exposes exactly
one API; there is nothing between the client and it to govern here.

Distributed-system concerns belong to the [microservices governance framework](https://github.com/jesusarielgb-works/microservices-governance-framework).

## Ready when

- [ ] Every document in this section has its INSTRUCTIONS block removed
- [ ] Every endpoint returns the shared error shape from `rest-conventions.md` on failure
- [ ] `contracts/openapi/_template-api.yaml` validates against the OpenAPI 3.1 schema

---

**Related:** [`../06-data/README.md`](../06-data/README.md) · [`../09-modules/README.md`](../09-modules/README.md)
