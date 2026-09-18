# _stacks — Stack Guides

> [!NOTE] INSTRUCTIONS
> Read this before the first line of code: choose the one guide whose language
> matches this project, adopt its tree and its commands, and delete the other
> three from this folder — and their rows from the Documents table below.
> Delete this block once the chosen guide's tree exists on disk.

## Purpose

Fourteen numbered sections say what to build and why, in words no language owns.
This folder is the one place that answers *how it looks on disk*: a real folder
tree, a boundary configuration that runs, the migration library, and commands
that can be pasted into a terminal.

## Documents

| Document | Answers | Priority |
|---|---|---|
| [java-spring.md](./java-spring.md) | What is the concrete shape in Java and Spring Boot, checked by ArchUnit? | ⭐ |
| [node-typescript.md](./node-typescript.md) | What is it in Node and TypeScript, checked by eslint-boundaries? | ⭐ |
| [python-django.md](./python-django.md) | What is it in Python and Django, checked by import-linter? | ⭐ |
| [php-laravel.md](./php-laravel.md) | What is it in PHP and Laravel, checked by Deptrac? | ⭐ |

Exactly one row is ⭐ for a given project — the one whose language matches. The
other three guides are deleted in the same pull request that adopts the tree,
and their rows go from the table above with them, so the repository never
carries advice — or a link to a deleted file — for a stack it does not run.

All four carry the same six headings in the same order — `Version baseline`,
`Module layout`, `Boundary enforcement`, `Migrations`, `Test layers`,
`Commands` — so two of them can be read side by side while a team is choosing.

What every guide guarantees:

| Heading | Renders |
|---|---|
| `Module layout` | The stack-agnostic tree in [`../05-architecture/module-structure.md`](../05-architecture/module-structure.md), worked through with `catalog` and `billing` |
| `Boundary enforcement` | The tool fixed for that stack in [`../05-architecture/boundary-enforcement.md`](../05-architecture/boundary-enforcement.md) — where its file lives, how it is invoked, what a violation prints |
| `Migrations` | The one-sequence-per-application policy in [`../06-data/migrations.md`](../06-data/migrations.md) |
| `Test layers` | `unit`, `module-integration` and `end-to-end` from [`../11-quality/testing-strategy.md`](../11-quality/testing-strategy.md), named verbatim |
| `Commands` | The five stages in [`../10-devops/ci-cd.md`](../10-devops/ci-cd.md), producing one artifact |

A language not listed — Kotlin, C#, Ruby, Go — takes the guide whose module
system is closest and keeps the six headings. The tree and the boundary rule
transfer; the tool names do not.

## Out of scope

These guides describe **one build, one artifact, one database**. Permanently
out of scope here, not deferred: a build per module, a pipeline per module, a
second artifact from the same commit, network calls between parts of this
application, and the tooling that exists to split an application apart —
microservices, service mesh, api gateway, service discovery, saga
orchestration, circuit breaker, and distributed transaction coordination.

Also out of scope: front-end build tooling, which belongs to
[`../12-ux-ui/README.md`](../12-ux-ui/README.md), and cloud provider setup,
which belongs to [`../10-devops/README.md`](../10-devops/README.md).

Distributed-system concerns belong to the
[microservices governance framework](https://github.com/jesusarielgb-works/microservices-governance-framework).

## Ready when

- [ ] One guide is chosen, the other three are deleted from this folder, and their rows are removed from the Documents table above
- [ ] The chosen guide's INSTRUCTIONS block is removed
- [ ] The tree in the chosen guide exists on disk under this project's own module names, and `catalog` and `billing` appear nowhere in the source
- [ ] The boundary configuration file the chosen guide names is committed, and has failed once on a deliberate violation
- [ ] Every command in the chosen guide's `Commands` table has been run once on a fresh clone
- [ ] Every version in the chosen guide's `Version baseline` table matches what the build actually resolves

---

**Related:** [`../05-architecture/README.md`](../05-architecture/README.md) · [`../10-devops/README.md`](../10-devops/README.md)
