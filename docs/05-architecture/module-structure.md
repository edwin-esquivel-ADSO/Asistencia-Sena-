# 05 — Module Structure

> [!NOTE] INSTRUCTIONS
> This tree is stack-agnostic: it shows which folders exist and what each one
> is allowed to contain, not what they are called in any one language. Pick the
> guide for this project's language in `../_stacks/` and adopt its concrete
> names before the first commit. Delete this block once the repository on disk
> matches the tree below.

## The tree

```
src/
├── catalog/                  module — one bounded context
│   ├── api/                  public API of the module
│   │   ├── CatalogFacade     the only entry point other modules may import
│   │   └── contracts/        immutable request and response objects
│   └── internal/             everything else; unreachable from outside
│       ├── domain/           entities, value objects, BR-NN invariants
│       ├── application/      use cases, transaction boundaries
│       └── persistence/      queries and mappings for this module's tables
├── billing/                  same shape: api/ + internal/
├── identity/                 illustrative only — see ./modular-monolith.md
└── platform/                 technical code owned by no bounded context
    ├── config/               framework wiring — the only place it may live
    └── errors/               shared error types and the global handler
resources/
├── app-config                one configuration file per environment
└── db/migration/             versioned changesets for the one database
tests/
├── unit/                     mirrors src/, one folder per module
├── module-integration/       one folder per module; imports api/ only
└── end-to-end/               the whole deployable; no module folders
```

## What each folder holds

| Folder | Contains | Never contains |
|---|---|---|
| `<module>/api/` | The facade and the objects that cross the boundary | Business rules, database access |
| `<module>/internal/` | Domain, application and persistence code | Imports from another module's `internal/` |
| `platform/config/` | Framework wiring, dependency registration | Business rules |
| `platform/errors/` | Error types and the handler that renders them | Module-specific error handling |
| `resources/db/migration/` | Ordered, versioned changesets for the single database | Data fixes applied by hand |
| `tests/module-integration/` | Tests that call a module through its public API | Assertions about another module's internals |

## Rules that survive any stack

| Rule | Reason |
|---|---|
| One unit per file, filename equal to the unit name | Grep and stack traces stay readable |
| Objects crossing a boundary are immutable | A shared mutable object is a boundary hole |
| `internal/` is never named in an import outside its own module | This is the line the `boundary check` reads |
| Test folders mirror `src/` exactly | A missing test folder is visible without running anything |
| One migration folder for the whole application | There is one database, so there is one ordered history |

## If this project is flat, not modular

Replace the module folders with the four layer folders from
[`layered-architecture.md`](./layered-architecture.md), keep `platform/`,
`resources/` and `tests/` unchanged, and drop `tests/module-integration/` —
there are no module boundaries yet to integrate across.

The concrete tree for Java, TypeScript, Python and PHP — real package names,
build-file layout and commands — lives in
[`../_stacks/README.md`](../_stacks/README.md).

---

**Related:** [`./modular-monolith.md`](./modular-monolith.md) · [`./boundary-enforcement.md`](./boundary-enforcement.md)
