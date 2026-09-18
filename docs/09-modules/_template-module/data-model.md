# [module-name] — Data Model

> [!NOTE] INSTRUCTIONS
> Copy this whole `_template-module/` folder once per module; never edit the
> template in place. Bracketed placeholders are expected here and are not a
> violation of the no-placeholder rule the rest of the repository follows.
> List only tables this module owns — see
> [`../../02-domain/module-boundaries.md`](../../02-domain/module-boundaries.md).

## Tables owned

| Table | Schema | Entity | Key attributes |
|---|---|---|---|
| `[module_name].[table_name]` | `[module_name]` | [Entity name] | [attributes; table name stays plural] |

Schema-per-module and naming rules live in
[`../../06-data/database-conventions.md`](../../06-data/database-conventions.md).

## Invariants

| Invariant | Enforced where |
|---|---|
| [the rule, e.g. a `BR-NN` from `entities-and-rules.md`] | This module's `internal/domain`, at write time |

## Cross-module references

| Column | Points to | Validated by |
|---|---|---|
| [`[other_singular_table]_id`, or "none"] | [`[other_module].[other_table]`, or "—"] | [`[Other]Facade`, never a foreign key] |

No foreign key crosses this module's schema boundary — a reference to
another module's row is a plain column, checked through that module's public
API at write time, not by a database constraint. The column is named for the
table it points at, not the module that owns it: `product_id`, never
`catalog_id`.

---

**Related:** [`./README.md`](./README.md) · [`../../06-data/models.md`](../../06-data/models.md)
