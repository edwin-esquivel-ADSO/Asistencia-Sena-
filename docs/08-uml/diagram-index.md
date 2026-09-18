# 08 — Diagram Index

> [!NOTE] INSTRUCTIONS
> One row per diagram that earns its keep — an outdated diagram is worse than
> no diagram. The four rows below are an example: delete them, then add one row
> per diagram this project keeps, each row written before its diagram is drawn.
> Delete this block once the table lists only this project's own diagrams.

## Diagrams

Example rows — they show the shape, not this project's inventory.

| Diagram | C4 level | Where it renders | Kept current by |
|---|---|---|---|
| System context | Context | Inline Mermaid, in the document that needs it | The pull request that adds or drops an external system |
| Single deployable | Container | Inline Mermaid, in [`../05-architecture/modular-monolith.md`](../05-architecture/modular-monolith.md) | The pull request that adds or drops a module |
| `catalog` internals | Component | Inline Mermaid, in that module's own folder under `09-modules/` | The pull request that moves code across the module's internal folders |
| `billing` internals | Component | A tool export committed under `diagrams/`, for a diagram Mermaid cannot express | The same pull request, plus a re-export |

## What each level answers

| Level | Question | Boxes it draws |
|---|---|---|
| Context | Who and what surrounds the application? | The application, its users, external systems it calls |
| Container | What is the single deployable made of? | The one deployable and the one database — nothing else |
| Component | What lives inside one module? | A facade box, plus its internal domain/application/persistence groups |

## Where the model stops

This project has exactly one container, described in
[`../05-architecture/modular-monolith.md`](../05-architecture/modular-monolith.md).
C4 goes no deeper than component: a code-level diagram documents what the
`boundary check` already enforces, and goes stale on the next refactor.

---

**Related:** [`./README.md`](./README.md) · [`../09-modules/module-catalog.md`](../09-modules/module-catalog.md)
