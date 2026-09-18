# 02 — Entities and Rules

> [!NOTE] INSTRUCTIONS
> List every entity that survives a restart — if it is not persisted, it is not
> an entity here, it is a request or a view. Number every business rule so it
> can be referenced from a test name. Delete this block once both tables match
> the actual schema.

## Entities

| Entity | Key attributes | Invariants |
|---|---|---|
| Product | sku, name, price, category, active | Price is never negative; active is false once retired |
| Category | name, parent category (optional) | A category cannot be its own ancestor |
| Invoice | line items, total, status, issued date | Total always equals the sum of its line items at issue time |
| Payment | invoice reference, amount, method, recorded date | The sum of payments on an invoice never exceeds its total |

## Business rules

1. **BR-01** — A retired product cannot appear as a line item on a new invoice.
2. **BR-02** — An invoice's total is fixed at issue time; a later price change
   does not alter an already-issued invoice.
3. **BR-03** — A payment cannot be recorded against an invoice already marked
   `paid`.
4. **BR-04** — A category with active products cannot be deleted, only retired.

## Where a rule is enforced

Every `BR-NN` rule lives in the module that owns the entity it governs — see
[`module-boundaries.md`](./module-boundaries.md) for which module that is. A
rule enforced in two modules is a sign the boundary is in the wrong place.

---

**Related:** [`./domain-map.md`](./domain-map.md) · [`./module-boundaries.md`](./module-boundaries.md)
