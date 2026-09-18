# 04 — Requirements

> [!NOTE] INSTRUCTIONS
> Read this before filling in any document in this section.
> Delete this block once every document in the section is complete.

## Purpose

This section states what the system must do, from the user's point of view,
and how well it must do it, in terms precise enough to test against — before
architecture, data, or API design begins.

## Documents

| Document | Answers | Priority |
|---|---|---|
| [user-stories.md](./user-stories.md) | What must the system do, from the user's voice? | ⭐ |
| [non-functional.md](./non-functional.md) | What qualities must it meet, and with what number? | ⭐ |
| [traceability-matrix.md](./traceability-matrix.md) | What code and what test justifies each requirement? | ⭐ |
| [_template-hu.md](./_template-hu.md) | Template — copy it once per user story | — |

## Out of scope

This section states what the system must do and how well — it does not decide
architecture, data schemas, or module internals, and it assumes the whole
system ships as one deployable. A requirement here names a measurable outcome,
never a distributed deployment topology, and nothing in this section assumes
microservices, service mesh, API gateway, service discovery, saga, circuit
breaker, or distributed transaction semantics. Distributed-system concerns
belong to the [microservices governance framework](https://github.com/jesusarielgb-works/microservices-governance-framework).

## Ready when

- [ ] `user-stories.md`, `non-functional.md`, and `traceability-matrix.md` each have their INSTRUCTIONS block removed
- [ ] Every `HU-NN` names exactly one module from [`module-boundaries.md`](../02-domain/module-boundaries.md)
- [ ] Every `NFR-NN` has a numeric threshold and a stated way to measure it
- [ ] Every `HU-NN` appears at least once in `traceability-matrix.md`

---

**Related:** [`../03-product/README.md`](../03-product/README.md) · [`../05-architecture/README.md`](../05-architecture/README.md)
