# 00 — Git Conventions

> [!NOTE] INSTRUCTIONS
> This document is normative — a pull request that violates it is a request for
> changes, not a suggestion. Delete this block once a second person has reviewed
> it against how the team actually branches and merges today.

## Branch strategy

```
main                    Production. Always deployable. Merges only from release branches.
  |-- dev               Integration branch. Merges from feature branches.
        |-- feat/[description]    One branch per feature or user story
        |-- fix/[description]     One branch per bug fix
        |-- chore/[description]   Tooling, dependencies, docs
        |-- hotfix/[description]  Urgent fix branched from main
```

- Nobody commits directly to `main` or `dev`.
- One branch equals one task. Branches are deleted right after merge.

## Branch naming

`[type]/[short-description-in-kebab-case]` — example: `feat/invoice-pdf-export`

## Commit format (Conventional Commits)

| Type | When to use |
|---|---|
| `feat` | New functionality |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Restructuring without behavior change |
| `test` | Add or change tests |
| `chore` | Tooling, dependencies, CI |
| `perf` | Performance improvement |

Format: `type(scope): imperative, lowercase, no trailing period`. The scope is the
module name, for example `feat(billing): add partial refund`.

## Merge policy

- **Squash and merge** for feature branches into `dev` — one commit per story.
- **Merge commit** for `dev` into `main` at release time — keeps release history.
- **Rebase is not used** on branches more than one person has pulled.
- A pull request needs one approval and a green pipeline before it can merge.

---

**Related:** [`agile-conventions.md`](./agile-conventions.md) · [`README.md`](./README.md)
