# 02 — Domain

> [!NOTE] INSTRUCTIONS
> Read this before filling in any document in this section.
> Delete this block once every document in the section is complete.

## Purpose

This section describes the business the system exists to serve: its bounded
contexts, its entities and rules, and the module boundaries drawn inside the
single deployable to keep them apart.

## Documents

| Document | Answers | Priority |
|---|---|---|
| [domain-map.md](./domain-map.md) | How do the domain's contexts relate to each other? | — |
| [entities-and-rules.md](./entities-and-rules.md) | What entities exist, and what rules govern them? | ⭐ |
| [module-boundaries.md](./module-boundaries.md) | Where does one module end and the next begin? | ⭐ |

## Out of scope

This section draws boundaries inside one deployable application — it does not
specify database schemas, API contracts, or code layout. A module here is an
internal boundary enforced by a linter, never an independently deployed unit,
and nothing in this section assumes microservices, service mesh, API gateway,
service discovery, saga, circuit breaker, or distributed transaction semantics.
Distributed-system concerns belong to the
[microservices governance framework](https://github.com/jesusarielgb-works/microservices-governance-framework).

## Ready when

- [ ] `domain-map.md`, `entities-and-rules.md`, and `module-boundaries.md` each have their INSTRUCTIONS block removed
- [ ] Every bounded context in `domain-map.md` maps to exactly one module in `module-boundaries.md`
- [ ] Every business rule in `entities-and-rules.md` has a unique `BR-NN` id

---

**Related:** [`../01-context/README.md`](../01-context/README.md) · [`../03-product/README.md`](../03-product/README.md)
