# 04 — User Stories

> [!NOTE] INSTRUCTIONS
> Write one story per row below, then copy `_template-hu.md` for the full
> narrative and acceptance criteria. Keep the index current — a story missing
> here is a story nobody can trace. Delete this block once the backlog below
> matches the tracker.

## Story identifier

`HU-NN` — sequential, two digits, starting at `01`. An id is never reused,
even for a story that gets dropped before it ships.

## Backlog

| HU-NN | Title | Module | Priority |
|---|---|---|---|
| HU-01 | Register a new product | `catalog` | ⭐ |
| HU-02 | Retire a product | `catalog` | ⭐ |
| HU-03 | Organize products into categories | `catalog` | — |
| HU-04 | Issue an invoice from a confirmed order | `billing` | ⭐ |
| HU-05 | Record a payment against an invoice | `billing` | ⭐ |
| HU-06 | View the daily sales summary | `billing` | ⭐ |

## Writing a new story

Copy [`_template-hu.md`](./_template-hu.md), assign the next unused `HU-NN`,
fill in the narrative and Gherkin acceptance criteria, then add a row above.
A story whose acceptance criteria cannot be checked by reading the running
application is not ready for the backlog.

---

**Related:** [`./_template-hu.md`](./_template-hu.md) · [`./traceability-matrix.md`](./traceability-matrix.md)
