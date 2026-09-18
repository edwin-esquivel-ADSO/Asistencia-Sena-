# 06 — Data

> [!NOTE] INSTRUCTIONS
> Read this before filling in any document in this section.
> Delete this block once every document in the section is complete.

## Purpose

This section defines the single database's shape: which module owns which
table, how tables and columns are named, and how the schema is versioned.

## Documents

| Document | Answers | Priority |
|---|---|---|
| [models.md](./models.md) | What is the data model, and which module owns each table? | ⭐ |
| [database-conventions.md](./database-conventions.md) | How are tables, columns, keys and indexes named and structured? | ⭐ |
| [migrations.md](./migrations.md) | How is the schema versioned, and what is the rollback policy? | ⭐ |

## Out of scope

A second physical database, database-per-module or database-per-service
splits, replication between independently owned datastores, and any
consistency mechanism — sagas, eventual consistency, distributed
transactions — needed only because data lives in more than one database.
One database, one transaction log, for as long as this framework's growth
path stops at the modular monolith.

Distributed-system concerns belong to the [microservices governance framework](https://github.com/jesusarielgb-works/microservices-governance-framework).

## Ready when

- [ ] Every document in this section has its INSTRUCTIONS block removed
- [ ] Every row in `models.md` lists an owning module that also appears in [`module-boundaries.md`](../02-domain/module-boundaries.md)
- [ ] Every migration under `resources/db/migration/` follows the naming and rollback rules in `migrations.md`

---

**Related:** [`../05-architecture/README.md`](../05-architecture/README.md) · [`../09-modules/README.md`](../09-modules/README.md)
