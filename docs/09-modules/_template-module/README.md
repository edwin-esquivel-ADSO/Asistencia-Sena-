# [module-name] — Module Overview

> [!NOTE] INSTRUCTIONS
> Copy this whole `_template-module/` folder to `[module-name]/` once per
> module listed in [`../module-catalog.md`](../module-catalog.md); never edit
> the template in place. Bracketed placeholders are expected here and are
> not a violation of the no-placeholder rule the rest of the repository
> follows.

## Purpose

[One or two sentences: the business capability this module owns, and what
data it is the authoritative source of.]

## Public API

| Method | Input | Output | Called by |
|---|---|---|---|
| `[Module]Facade.[method]` | [request shape] | [response shape] | [the other module, or "any module"] |

Everything not listed above is `internal/` and unreachable from outside this
module — see [`../../05-architecture/module-structure.md`](../../05-architecture/module-structure.md).

## Dependencies

| Depends on | Through | Why |
|---|---|---|
| [`[Other]Facade`, or "none"] | [public API call / in-process event] | [the one-sentence reason] |

## In-process events

| Event | Direction | Other module(s) involved |
|---|---|---|
| [`[Module][SomethingHappened]`] | Emits | [who reacts, or "none yet"] |
| [`[Other][SomethingHappened]`] | Consumes | [the module that emits it] |

An in-process event is a synchronous call inside the same request, same
transaction, same release — never a queue or a broker.

---

**Related:** [`./data-model.md`](./data-model.md) · [`../module-catalog.md`](../module-catalog.md)
