# 02 — Domain Map

> [!NOTE] INSTRUCTIONS
> Draw each bounded context as a box and each relationship as a labeled arrow.
> A context with no relationship to anything else is either wrong or the seed
> of a good module boundary. Delete this block once the diagram matches reality.

## Bounded contexts

```mermaid
graph TD
    Catalog["Catalog<br/>products, categories"]
    Billing["Billing<br/>invoices, invoice_lines, payments"]

    Billing -->|reads current price from| Catalog
    Billing -->|validates product references with| Catalog
```

## Relationship legend

| Arrow | Meaning |
|---|---|
| `reads current price from` | Read-only lookup; Billing owns no pricing data. The price is copied onto the invoice line at issue time, per **BR-02** |
| `validates product references with` | Read-only check that the product an invoice line names exists and is not retired, per **BR-01** — the stored `product_id` is a plain column, never a foreign key |

## How this map is used

Every bounded context above becomes exactly one module in
[`module-boundaries.md`](./module-boundaries.md), owning the tables named here.
A context with no box on this map has no reason to be its own module either.

---

**Related:** [`./entities-and-rules.md`](./entities-and-rules.md) · [`./module-boundaries.md`](./module-boundaries.md)
