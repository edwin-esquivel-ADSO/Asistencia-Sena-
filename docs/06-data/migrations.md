# 06 — Migrations

> [!NOTE] INSTRUCTIONS
> One version history for the whole database, even though modules own
> separate schemas. Fill in the rollback policy before the second migration
> ships. Delete this block once a rollback has been rehearsed once.

## One sequence for the whole application

There is one database, so there is one ordered changelog — never a
changelog per module. A changeset touching `catalog`'s schema and one
touching `billing`'s schema still apply in the same numbered sequence,
under `resources/db/migration/` (see
[`module-structure.md`](../05-architecture/module-structure.md)).

| Rule | Detail |
|---|---|
| Tool | Liquibase |
| Sequence | One changelog, one increasing version number, for the entire database |
| Changeset scope | One logical change per changeset; never edit a changeset already run anywhere |
| Module tag | Each changeset id is prefixed with its owning module, e.g. `billing-003`, for traceability only — it does not split the sequence |

## Rollback policy

| Change type | Rule |
|---|---|
| Additive (new nullable column, new table, new index) | Ships with an automatic or trivial rollback |
| Destructive (drop column, drop table, rename) | Two phases: deploy N adds the replacement and stops using the old shape in code; deploy N+1 drops it |
| Any changeset | Must define a working `rollback`, verified in CI before merge — a changeset with no rollback is incomplete |

## Mechanics

Changeset syntax, file layout and rollback authoring for Liquibase are not
repeated here — see
[liquibase-migration-standards](https://github.com/jesusarielgb-works/liquibase-migration-standards)
for the full standard. This document is the monolith-level policy that
standard's changesets must satisfy: one sequence, additive by default,
two-phase for anything destructive.

---

**Related:** [`./database-conventions.md`](./database-conventions.md) · [`../05-architecture/module-structure.md`](../05-architecture/module-structure.md)
