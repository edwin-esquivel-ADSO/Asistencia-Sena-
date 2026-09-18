# 06 — Database Conventions

> [!NOTE] INSTRUCTIONS
> Absorbs the v1.0.0 database conventions. The one open question is how a
> single database stays divided by module — decide schema or prefix here,
> because `modular-monolith.md`'s diagram names the rule without defining
> it. Delete this block once a migration has shipped using it.

## One database, divided by module

| Mechanism | How it works | Enforced by | Reviewer check |
|---|---|---|---|
| **Schema per module** (recommended) | Each module gets one namespace — `catalog.products`, `billing.invoices` | A database role per module, granted only on its own schema | Query the grant catalog: a module's role has zero grants outside its own schema |
| Table-prefix per module (fallback) | One namespace, tables prefixed — `catalog_products`, `billing_invoices` | Naming convention, checked by a lint script | The script maps every table's prefix to [`module-boundaries.md`](../02-domain/module-boundaries.md)'s "Owns" column and fails on an unrecognized prefix |

Default to schema per module — it is what
[`modular-monolith.md`](../05-architecture/modular-monolith.md)'s diagram
names, and a database role can enforce it the same way
[`boundary-enforcement.md`](../05-architecture/boundary-enforcement.md)
enforces boundaries in code: a check that fails on its own, not a comment.
Fall back to table-prefix only on an engine with no real schema namespace
(SQLite, or MySQL without a second database).

**No foreign key crosses a module boundary**, under either mechanism. A
module storing another module's id — `invoice_lines.product_id` — keeps it
as a plain column, validated by the owning module's public API at write
time, never by a `REFERENCES` constraint. Reviewer check: no row in the
foreign-key catalog references a table outside its own schema or prefix
group.

The reason is ownership, not a plan to split anything apart. A constraint
declared by `billing` on `catalog.products` is one module writing a rule into
another module's table, and it makes every later change to that table
`billing`'s problem to review. The cost is accepted rather than denied: the
database no longer refuses an orphaned `product_id`, so the facade check and a
`module-integration` test standing on it are what replace the constraint. A
write that spans two modules still commits inside the one transaction on the
one database [`../01-context/overview.md`](../01-context/overview.md) requires
— what moves is who checks the reference, not where the commit happens.

## Naming

| Element | Rule | Example |
|---|---|---|
| Entity — the concept, not a table | Singular, in the business's own words; the plural rule below is for tables and never reaches this column | `Product`, `Invoice line` |
| Table | snake_case, plural | `products`, `invoice_lines` |
| Column | snake_case | `unit_price`, `issued_date` |
| Primary key | `id`, UUID | `id UUID PRIMARY KEY` |
| Foreign key | `<singular table>_id` | `invoice_id`, `product_id` |
| Boolean | prefixed `is_` / `has_` | `is_active`, `has_discount` |
| Index | `idx_<table>_<column>` | `idx_invoice_lines_invoice_id` |

## Dates and audit columns

Every table carries `created_at` and `updated_at` as `TIMESTAMPTZ NOT NULL
DEFAULT NOW()`. A business date with no time component — `issued_date`,
`recorded_date` — is `DATE`, never `TIMESTAMPTZ`.

Stack-specific ORM mapping rules (fetch strategy, relationship laziness)
belong in [`../_stacks/`](../_stacks/README.md) once that guide exists for
this project's language — not here, so this document stays true for every
stack.

---

**Related:** [`../02-domain/module-boundaries.md`](../02-domain/module-boundaries.md) · [`../05-architecture/modular-monolith.md`](../05-architecture/modular-monolith.md)
