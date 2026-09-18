# 03 — Product

> [!NOTE] INSTRUCTIONS
> Read this before filling in any document in this section.
> Delete this block once every document in the section is complete.

## Purpose

This section states where the product is going and which problem justifies
building it at all, before a single requirement is written.

## Documents

| Document | Answers | Priority |
|---|---|---|
| [vision.md](./vision.md) | Where is the product going? | ⭐ |
| [problem-framing.md](./problem-framing.md) | What problem is solved, and for whom? | ⭐ |

## Out of scope

This section sets direction and frames the problem — it does not define
measurable requirements, architecture, or delivery mechanics. The product is
one application released as a whole, not a portfolio of independently shipped
pieces, and nothing here assumes microservices, service mesh, API gateway,
service discovery, saga, circuit breaker, or distributed transaction semantics.
Distributed-system concerns belong to the
[microservices governance framework](https://github.com/jesusarielgb-works/microservices-governance-framework).

## Ready when

- [ ] `vision.md` and `problem-framing.md` each have their INSTRUCTIONS block removed
- [ ] Every objective in `vision.md` has a metric a stakeholder agreed to
- [ ] The problem in `problem-framing.md` names at least one affected group from `01-context/overview.md`

---

**Related:** [`../02-domain/README.md`](../02-domain/README.md) · [`../04-requirements/README.md`](../04-requirements/README.md)
