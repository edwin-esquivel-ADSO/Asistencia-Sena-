# 05 — Layered Architecture

> [!NOTE] INSTRUCTIONS
> This is the documented variant for a project with a single bounded context.
> It is a correct choice at that size, not a temporary shortcut. Fill in the
> threshold table with this project's real numbers, and re-read it at every
> quarterly review. Delete this block once the layer table names the folders
> this project actually has.

## The four layers

| Layer | Responsibility | May depend on |
|---|---|---|
| Presentation | Accept a request, validate its shape, delegate, format the response | Application, transport objects |
| Application | Business rules, transaction boundaries, orchestration of one use case | Persistence, Domain |
| Persistence | Read and write stored data; no business decisions | Domain |
| Domain | Entities, value objects, invariants such as `BR-01`..`BR-04` | Nothing |

Concrete folder and class names per language live in
[`../_stacks/README.md`](../_stacks/README.md); the responsibilities above do
not change with the stack.

## Dependency direction

```
Presentation  ->  Application  ->  Persistence  ->  Domain
```

| Rule | Why it holds |
|---|---|
| Dependencies point one way only, left to right | A cycle between layers makes every layer untestable alone |
| Domain depends on nothing outside itself | It must be testable with no database and no framework |
| Presentation never calls Persistence directly | A rule skipped once is a rule that does not exist |
| Application never imports web-framework types | Business rules must survive a change of framework |
| Framework wiring lives in one configuration folder | Wiring scattered through business code cannot be reviewed |

## When flat layers stop being enough

The deciding signal is the **number of bounded contexts on the domain map** —
count the boxes in [`domain-map.md`](../02-domain/domain-map.md).

| Signal | Flat layers still fit | Time to move to modules |
|---|---|---|
| Bounded contexts on the domain map | exactly 1 | 2 or more |
| Persistent entities | up to ~10 | more than ~10 |
| Developers committing in a normal week | up to 3 | 4 or more |
| Cross-area collisions | rare | two people edit the same application-layer file weekly |

**The line:** row 1 is the trigger, and the only one — a module *is* a bounded
context, so with one box on the map there is no second module to create, and a
boundary drawn anyway would be technical, which is a layer. Rows 2-4 are
corroboration: two of them crossing while row 1 has not means the map is
under-drawn — redraw [`domain-map.md`](../02-domain/domain-map.md) with the team
and count row 1 again. Below the line stay flat: an eight-entity system in one
context is faster to change and cheaper to test as four layers than as modules,
and adding boundaries to it buys nothing.

## How the move happens

| Step | What changes |
|---|---|
| 1 | Draw the second bounded context in [`domain-map.md`](../02-domain/domain-map.md) and name its module |
| 2 | Move that context's classes out of each layer folder into one module folder, layers intact inside it |
| 3 | Give the module a public API and mark the rest internal |
| 4 | Turn on the `boundary check` described in [`boundary-enforcement.md`](./boundary-enforcement.md) |
| 5 | Record the move as a new ADR that supersedes nothing — `ADR-001` already allows it |

Layers do not disappear in the move: each module keeps the same four layers
inside its own folder. The end state is the modular monolith, and that is where
this framework's growth path ends.

---

**Related:** [`./modular-monolith.md`](./modular-monolith.md) · [`./module-structure.md`](./module-structure.md)
