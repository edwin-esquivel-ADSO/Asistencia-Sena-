# 08 — UML

> [!NOTE] INSTRUCTIONS
> Read this before filling in any document in this section.
> Delete this block once every document in the section is complete.

## Purpose

This section keeps the diagrams that explain the shape of the single
deployable, from system context down to component level. Each one is Mermaid
embedded in the document that needs it — the way every other section draws its
diagrams — and `diagrams/` holds only what Mermaid cannot express: a tool's own
source under `source/`, its rendered export under `exports/`.

## Documents

| Document | Answers | Priority |
|---|---|---|
| [diagram-index.md](./diagram-index.md) | What diagram exists, and what does each one answer? | ⭐ |

## Out of scope

A deployment diagram for independently scaled or independently released
services, a sequence diagram whose steps are network hops between separate
processes, and any diagram whose purpose is to show microservices, a service
mesh, an API gateway, or service discovery topology. This application has
one container; C4 stops at component here because there is no second
deployable to draw a lower boundary against.

Distributed-system concerns belong to the [microservices governance framework](https://github.com/jesusarielgb-works/microservices-governance-framework).

## Ready when

- [ ] `diagram-index.md` has its INSTRUCTIONS block removed
- [ ] Every row in `diagram-index.md` names a diagram that renders — inline Mermaid in a document that exists, or a file committed under `diagrams/`
- [ ] No diagram indexed here models anything below C4 component level

---

**Related:** [`../05-architecture/README.md`](../05-architecture/README.md) · [`../09-modules/README.md`](../09-modules/README.md)
