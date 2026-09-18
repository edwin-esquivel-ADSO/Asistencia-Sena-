# 05 — Boundary Enforcement

> [!NOTE] INSTRUCTIONS
> A boundary nobody checks is a comment. Pick the tool for this project's
> language, commit its rule file before the second module exists, and wire the
> `boundary check` stage. Delete this block once that stage has failed on purpose.

## What is being enforced

One rule, in every language: **a module may import another module's `api/`, and
never its `internal/`.** Names come from [`module-boundaries.md`](../02-domain/module-boundaries.md),
folders from [`module-structure.md`](./module-structure.md).

## Tool per stack

| Stack | Tool | The rule you write |
|---|---|---|
| Java / Spring | **ArchUnit** | A test asserting no class outside a module depends on its internal packages |
| Node / TypeScript | **eslint-boundaries** | An element type per folder, then an allow-list of imports between them |
| Python / Django | **import-linter** | A `forbidden` contract from each module to every other module's internals |
| PHP / Laravel | **Deptrac** | A layer per module folder, then a ruleset naming the layers each may reach |

Each tool is configured in full, per language, in [`../_stacks/README.md`](../_stacks/README.md).

## One rule per tool

```java
// ArchUnit — an ordinary test in the build
@ArchTest static final ArchRule billing_uses_catalog_api_only =
    noClasses().that().resideInAPackage("..billing..")
        .should().dependOnClassesThat().resideInAPackage("..catalog.internal..");
```

```jsonc
// eslint-boundaries — .eslintrc
"settings": { "boundaries/elements": [
  { "type": "api", "pattern": "src/*/api/**", "capture": ["module"] },
  { "type": "internal", "pattern": "src/*/internal/**", "capture": ["module"] }] },
"rules": { "boundaries/element-types": ["error", { "default": "disallow", "rules": [
  { "from": ["api", "internal"], "allow": ["api", ["internal", { "module": "${from.module}" }]] }] }] }
```

```ini
; import-linter — .importlinter
[importlinter:contract:module-privacy]
name = billing reaches catalog through its public API only
type = forbidden
source_modules = app.billing
forbidden_modules = app.catalog.internal
```

```yaml
# Deptrac — deptrac.yaml
layers:
  - { name: CatalogApi, collectors: [{ type: directory, value: src/catalog/api/.* }] }
  - { name: CatalogInternal, collectors: [{ type: directory, value: src/catalog/internal/.* }] }
  - { name: Billing, collectors: [{ type: directory, value: src/billing/.* }] }
ruleset: { CatalogApi: [CatalogInternal], Billing: [CatalogApi] }  # absent means forbidden
```

## Where it runs

| Stage | Scope | On failure |
|---|---|---|
| Pre-commit hook, optional | Changed files only | The commit is refused locally |
| `boundary check`, defined in [`../10-devops/ci-cd.md`](../10-devops/ci-cd.md) | The whole tree, on every pull request | The build fails; the pull request cannot merge |

It runs before the test stages: a boundary violation makes test results uninteresting.

## Breaking the rule on purpose

A suppression needs the tool's inline exemption, a comment naming the `HU-NN`
that forced it, and an ADR recording why — see
[`decisions/README.md`](./decisions/README.md). One with no ADR is a defect.

---

**Related:** [`./module-structure.md`](./module-structure.md) · [`../02-domain/module-boundaries.md`](../02-domain/module-boundaries.md)
