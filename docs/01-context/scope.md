# 01 — Scope

> [!NOTE] INSTRUCTIONS
> Replace both lists with what this product actually includes and excludes.
> The "Out of scope" list is mandatory — a product with nothing excluded has not
> been scoped, it has only been described. Delete this block once a stakeholder
> has confirmed both lists.

## In scope

| Capability | Note |
|---|---|
| Product catalog management | Create, price, categorize, and retire products |
| Invoicing | Generate an invoice from an order and track its status |
| Payment recording | Record a payment against an invoice and reconcile the balance |
| Daily sales summary | One report, generated at close of business |

## Out of scope

| Capability | Why it is excluded |
|---|---|
| Order capture | Orders are taken and confirmed upstream of this application; it receives an order already confirmed and invoices it, and stores no order of its own |
| Multi-currency pricing | The business trades in one currency only |
| Customer self-service portal | Customers deal with staff directly, not a login |
| Marketplace / multi-vendor selling | The catalog belongs to one seller |
| Splitting catalog or billing into a separately deployed application | This product ships and scales as one deployable, by design |

## Revisiting scope

An item moves from "Out" to "In" only after `03-product/vision.md` is updated
first — scope follows vision, not the other way around.

---

**Related:** [`./overview.md`](./overview.md) · [`../03-product/problem-framing.md`](../03-product/problem-framing.md)
