# _stacks — PHP and Laravel

> [!NOTE] INSTRUCTIONS
> Adopt this guide only if the application is Laravel; copy the tree, `deptrac.yaml` and the commands before the second module exists.
> Delete this block once the tree on disk matches, under this project's own module names.

## Version baseline

Checked **2026-09-12**. Re-check every row before adopting this guide.

| Component | Version | Verify with |
|---|---|---|
| PHP and Laravel | 8.3 and 13.x | `php --version`, `php artisan --version` |
| Deptrac and PHPUnit | 4.x (`deptrac/deptrac` — the older `qossmic/deptrac` is abandoned; root key is still `deptrac:`) and 11.x, both dev dependencies | `vendor/bin/deptrac --version`, `vendor/bin/phpunit --version` |

## Module layout

```
app/                       this platform's src/; the skeleton's app/Models and app/Http are removed
├── Catalog/
│   ├── Api/CatalogFacade.php + Api/Contracts/ProductView.php   all Billing may import
│   ├── Internal/Domain/Product.php + Internal/Application/RetireProduct.php   invariants, then the transaction
│   └── Internal/Persistence/ProductRepository.php   maps products
├── Billing/    same shape — BillingFacade, invoices, invoice_lines
└── Platform/   Config/ wires the framework, Http/ the routes, Errors/ the handler — but each module binds its own internals in its own provider
```

`composer.json` maps `App\` to `app/`, so that facade is the class `App\Catalog\Api\CatalogFacade`. Beside `app/` sit `database/migrations/`, `tests/` — holding `Unit/`, `ModuleIntegration/`, `EndToEnd/` — and `deptrac.yaml`.

## Boundary enforcement

```yaml
# deptrac.yaml — every class under app/ must fall inside a layer below: one that no collector claims is invisible to the ruleset, which is the quietest way for a boundary rule to stop enforcing anything.
deptrac:
  paths: [./app]
  layers:
    - { name: CatalogApi,      collectors: [{ type: directory, value: app/Catalog/Api/.* }] }
    - { name: CatalogInternal, collectors: [{ type: directory, value: app/Catalog/Internal/.* }] }
    - { name: BillingApi,      collectors: [{ type: directory, value: app/Billing/Api/.* }] }
    - { name: BillingInternal, collectors: [{ type: directory, value: app/Billing/Internal/.* }] }
    - { name: Platform,        collectors: [{ type: directory, value: app/Platform/.* }] }
  ruleset:
    CatalogApi:      [CatalogApi, CatalogInternal, Platform]
    CatalogInternal: [CatalogInternal, CatalogApi, Platform]
    BillingApi:      [BillingApi, BillingInternal, Platform, CatalogApi]
    BillingInternal: [BillingInternal, BillingApi, Platform, CatalogApi]
    Platform:        [Platform, CatalogApi, BillingApi]
```

- `App\Catalog\Api\CatalogFacade` → `App\Catalog\Internal\Application\RetireProduct` — **allowed**: `CatalogApi` lists `CatalogInternal`. A module's own facade reaching its own internals is the case a per-folder-kind ruleset gets wrong, so it is written out here rather than assumed.
- `App\Billing\Internal\Application\IssueInvoice` → `App\Catalog\Api\CatalogFacade` — **allowed**: `BillingInternal` lists `CatalogApi`.
- `App\Billing\Internal\Application\IssueInvoice` → `App\Catalog\Internal\Domain\Product` — **fails**: `BillingInternal` does not list `CatalogInternal`, and an absent entry is a forbidden one. Deptrac names both classes and both layers, and exits non-zero. Note that every layer above lists itself, so intra-layer traffic never rests on a tool default; and that Deptrac has no per-module capture, so each new module costs two layers plus one entry in every other module's rules — a standing reason to prefer fewer, larger modules.

## Migrations

- **Library and files** — Laravel's own migrations, under `database/migrations/`: one timestamped sequence for the whole application, which is what [`../06-data/migrations.md`](../06-data/migrations.md) requires. Prefix the descriptive half with the owning module, `billing_add_invoice_lines`, so the timestamp orders the sequence and the prefix names the owner; each file's `down()` is the rollback that document demands.
- **Policy** — that document names Liquibase as the default tool; a Laravel project keeping Artisan migrations instead still owes it one ordered history for the one database.

## Test layers

| Layer | Runner | Shape |
|---|---|---|
| `unit` | PHPUnit over `tests/Unit`, no `RefreshDatabase` | Constructs `RetireProduct` directly; every collaborator is a test double |
| `module-integration` | PHPUnit over `tests/ModuleIntegration` with `RefreshDatabase`, real PostgreSQL | Calls `BillingFacade::issueInvoice(...)` from outside `Billing`; names no `Internal` class |
| `end-to-end` | PHPUnit over `tests/EndToEnd`, declared as its own suite in `phpunit.xml` | `$this->postJson('/api/v1/invoices')` against the whole application |

## Commands

| Stage | Command | What it does |
|---|---|---|
| `build` | `composer install --no-interaction --prefer-dist` | Installs from the lockfile and rebuilds the autoloader; an unresolvable class fails here |
| `boundary check` | `vendor/bin/deptrac analyse` | The ruleset above over `app/`, before any test runs |
| `test` | `php artisan test --coverage` | The default suite — `Unit` and `ModuleIntegration`, fixed by `defaultTestSuite` in `phpunit.xml` so `EndToEnd` stays out. Its per-file coverage feeds **NFR-07**: 80% on changed files, 90% on the `billing` module |
| `package` | `docker build -t app:$(git rev-parse --short HEAD) .` | One image, tagged with the commit |
| `deploy` | `php artisan test --testsuite=EndToEnd` | `end-to-end` against the promoted artifact |
| local | `php artisan migrate`, then `php artisan serve --port=3000` | Applies pending changes; serves on port 3000 — the value `.env.example` gives `APP_PORT`, this framework's default |

---

**Related:** [`./README.md`](./README.md) · [`../05-architecture/boundary-enforcement.md`](../05-architecture/boundary-enforcement.md)
