# _stacks — Node and TypeScript

> [!NOTE] INSTRUCTIONS
> Adopt this guide only if the application is TypeScript on Node; copy the tree, `eslint.config.js` and the commands before the second module exists.
> Delete this block once the tree on disk matches, under this project's own module names.

## Version baseline

Checked **2026-09-12**. Re-check every row before adopting this guide.

| Component | Version | Verify with |
|---|---|---|
| Node and TypeScript | 22 (LTS) and 5.x, `"module": "nodenext"` | `node --version`, `npx tsc --version` |
| ESLint and eslint-plugin-boundaries | 10.x and 7.x, flat config — the configuration below is written in the plugin's pre-7 rule shape, which 7.x still enforces under key names it has since renamed | `npx eslint --version` |
| Vitest | 5.x | `npx vitest --version` |

## Module layout

```
src/
├── catalog/
│   ├── api/CatalogFacade.ts + api/contracts/product-view.ts   all billing may import
│   ├── internal/domain/product.ts                  BR-NN invariants live here
│   ├── internal/application/retire-product.ts      opens the transaction
│   └── internal/persistence/product-repository.ts  maps products
├── billing/    same shape — BillingFacade, invoices, invoice_lines
└── platform/   config/ reads the environment once, errors/ holds the error middleware
tests/       unit/, module-integration/, end-to-end/ — mirroring src/
```

Declare no `paths` alias that makes another module's internals reachable under a friendly name: the linter below matches file paths, so an alias that hides the folder hides the violation with it.

## Boundary enforcement

```js
// eslint.config.js — mode defaults to "folder": each pattern names a folder, and every file beneath it inherits that type and its captured module.
import boundaries from "eslint-plugin-boundaries";
export default [{
  plugins: { boundaries },
  settings: { "boundaries/elements": [
    { type: "api",      pattern: "src/*/api",      capture: ["module"] },
    { type: "internal", pattern: "src/*/internal", capture: ["module"] },
    { type: "platform", pattern: "src/platform" } ] },
  rules: { "boundaries/element-types": ["error", { default: "disallow", rules: [
    { from: ["api", "internal"], allow: ["platform", "api", ["internal", { module: "${from.module}" }]] },
    { from: ["platform"], allow: ["platform", "api"] } ] }] }
}];
```

- `catalog/api/CatalogFacade.ts` → `../internal/application/retire-product` — **allowed**: the importer is `{api, module: catalog}` and the target `{internal, module: catalog}`, so `${from.module}` resolves to `catalog` and the qualified `internal` entry matches. A facade reaching its own internals is the normal case, not an exception.
- `billing/internal/application/issue-invoice.ts` → `../../../catalog/api/CatalogFacade` — **allowed**: `api` appears unqualified in the same allow list, so any module's facade is reachable from anywhere.
- `billing/internal/application/issue-invoice.ts` → `../../../catalog/internal/domain/product` — **fails**: the target is `{internal, module: catalog}` while `${from.module}` is `billing`, no entry matches, and `default: "disallow"` reports `boundaries/element-types` with the file and line.

## Migrations

- **Library and files** — `node-pg-migrate`, writing timestamped files into `resources/db/migration/`: one sequence for the whole application, as [`../06-data/migrations.md`](../06-data/migrations.md) requires. Each file exports `up` and `down`; `down` is the rollback that document demands.
- **Naming and policy** — prefix the descriptive half with the owning module, `billing-add-invoice-lines`, so the timestamp orders the sequence and the prefix says who owns the change. That document names Liquibase as the default tool; a Node project running Liquibase through its CLI instead keeps the same folder and the same rule. What may never change is one ordered history for the one database.

## Test layers

| Layer | Runner | Shape |
|---|---|---|
| `unit` | Vitest, doubles via `vi.fn()`, no database | `tests/unit/` mirrors `src/`; imports the unit under test directly |
| `module-integration` | Vitest with `@testcontainers/postgresql`, a real schema per run | `tests/module-integration/billing/` imports `src/billing/api` and nothing deeper |
| `end-to-end` | Vitest with `supertest`, against the built `dist/` | `POST /api/v1/invoices`, exercised exactly as the artifact is deployed |

## Commands

| Stage | Command | What it does |
|---|---|---|
| `build` | `npm ci && npx tsc -p tsconfig.build.json` | Installs from the lockfile, type-checks, emits `dist/` |
| `boundary check` | `npx eslint src --max-warnings 0` | The rule above, over the whole tree, before any test runs. On 7.x the pre-7 rule shape emits deprecation notices: drop `--max-warnings 0`, or silence the notices, until the configuration is migrated |
| `test` | `npx vitest run tests/unit tests/module-integration --coverage` | The two layers the stage owns. Coverage lands in `coverage/lcov.info`, whose per-file records the stage reads to apply **NFR-07**: 80% on changed files, 90% on the `billing` module |
| `package` | `docker build -t app:$(git rev-parse --short HEAD) .` | One image from `dist/`, tagged with the commit |
| `deploy` | `npx vitest run tests/end-to-end` | `end-to-end` against the promoted artifact |
| local | `npm run dev`, then `npx node-pg-migrate up -m resources/db/migration` | Serves on `APP_PORT`; applies pending migrations to the local database |

---

**Related:** [`./README.md`](./README.md) · [`../05-architecture/boundary-enforcement.md`](../05-architecture/boundary-enforcement.md)
