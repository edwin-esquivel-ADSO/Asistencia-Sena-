# 09 — Modules

> [!NOTE] INSTRUCTIONS
> Read this before filling in any document in this section.
> Delete this block once every document in the section is complete.

## Purpose

This section catalogs every module inside the single deployable, with a
subfolder per module for its README, data model, decisions, and runbook. Add
a module by copying `_template-module/` once, never by editing the template
itself.

## Documents

| Document | Answers | Priority |
|---|---|---|
| [module-catalog.md](./module-catalog.md) | What modules exist today? | ⭐ |
| [_template-module/README.md](./_template-module/README.md) | Template — copy the whole `_template-module/` folder once per module | — |

## Out of scope

Extracting a module into its own deployable, a per-module release pipeline
or version number, network communication between modules — REST, gRPC,
message queues — and any topology diagram for microservices, a service
mesh, service discovery, or a saga spanning modules. Two modules here talk
through one in-process public API call or an in-process event, in the same
transaction, on the same release, always.

Distributed-system concerns belong to the [microservices governance framework](https://github.com/jesusarielgb-works/microservices-governance-framework).

## Ready when

- [ ] `module-catalog.md` has its INSTRUCTIONS block removed
- [ ] Every module in `module-catalog.md` has a folder copied from `_template-module/`, with all four files filled in
- [ ] Every module named here is spelled the same way in [`module-boundaries.md`](../02-domain/module-boundaries.md), and no other

---

**Related:** [`../08-uml/README.md`](../08-uml/README.md) · [`../13-operations/README.md`](../13-operations/README.md)
