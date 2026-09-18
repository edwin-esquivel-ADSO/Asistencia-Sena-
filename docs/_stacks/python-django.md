# _stacks — Python and Django

> [!NOTE] INSTRUCTIONS
> Adopt this guide only if the application is Django; copy the tree, `.importlinter` and the commands before the second module exists.
> Delete this block once the tree on disk matches, under this project's own module names.

## Version baseline

Checked **2026-09-12**. Re-check every row before adopting this guide.

| Component | Version | Verify with |
|---|---|---|
| Python and Django | 3.12 and 5.2 (LTS) | `python --version`, `python -m django --version` |
| import-linter | 2.x, invoked as `lint-imports` | `lint-imports --version` |
| pytest and pytest-django | 8.x and 4.x | `pytest --version` |

## Module layout

```
app/
├── catalog/                                   a Django app in INSTALLED_APPS; apps.py and migrations/ sit at its root
│   ├── api/facade.py + api/contracts.py       all billing may import
│   ├── internal/domain/product.py + internal/application/retire_product.py   invariants, then transaction.atomic()
│   ├── internal/persistence/models.py         maps products
│   └── models.py                              re-exports them so the app registry finds them
├── billing/    same shape — BillingFacade, invoices, invoice_lines
└── platform/   config/ holds settings, errors/ holds the exception handler
```

`manage.py`, `config/settings/` (one file per environment), `.importlinter` and `tests/` — holding `unit/`, `module_integration/`, `end_to_end/` — sit beside `app/` at the repository root. Django builds its model registry by importing `<app>/models.py` only, so models kept under `internal/persistence/` need that one-line re-export or no migration will ever see them — which is why the contract below treats `app.catalog.models` as private too. Keep the repository root on `sys.path` rather than `app/`, so `app.platform` can never shadow the standard library's module of that name. Marker names take underscores: the layer `module-integration` becomes `@pytest.mark.module_integration`.

## Boundary enforcement

```ini
# .importlinter — allow_indirect_imports is what keeps billing -> CatalogFacade -> catalog.internal legal.
[importlinter]
root_package = app
[importlinter:contract:catalog-internals-are-private]
name = Only catalog imports catalog's internals
type = forbidden
allow_indirect_imports = True
source_modules =
    app.billing
    app.platform
forbidden_modules =
    app.catalog.internal
    app.catalog.models
```

- `app.catalog.api.facade` → `app.catalog.internal.application.retire_product` — **allowed**: nothing under `app.catalog` appears in `source_modules`, so this contract never examines the import at all. A facade reaching its own internals stays unhindered.
- `app.billing.internal.application.issue_invoice` → `app.catalog.api.facade` — **allowed**: `app.catalog.api` is a descendant of neither forbidden module. Without `allow_indirect_imports` the chain onward into `catalog.internal` would itself be reported, because a forbidden contract counts indirect imports as violations by default — which would make every facade unusable.
- `app.billing.internal.application.issue_invoice` → `app.catalog.internal.domain.product` — **fails**: a forbidden contract matches descendants on both sides, so the importer counts as `app.billing` and the target as `app.catalog.internal`. `lint-imports` names the broken contract, the import and its line number, and exits non-zero. One contract per module: `billing`'s twin swaps the two names, and a third module adds a contract of its own plus one `source_modules` line to each existing one.

## Migrations

- **Library and files** — Django's own migrations. Its loader looks only in `<app>/migrations/`, so the files live at `app/catalog/migrations/` and `app/billing/migrations/`, not in the single folder [`../05-architecture/module-structure.md`](../05-architecture/module-structure.md) draws for stacks whose tools allow it.
- **One sequence** — [`../06-data/migrations.md`](../06-data/migrations.md) still governs: one ordered history for the one database. `python manage.py migrate --plan` proves it, printing the whole application's migrations as a single ordered list. Declare `dependencies` on every migration that assumes another module's table, or that order is accidental rather than stated; each migration's reverse operation is the rollback that document requires.

## Test layers

| Layer | Runner | Shape |
|---|---|---|
| `unit` | `pytest` with `pytest-django`, marker `unit`, no database | Calls the domain object directly; `SimpleTestCase` when a test needs Django at all |
| `module-integration` | `pytest` with `django.test.TestCase`, marker `module_integration`, real PostgreSQL | Calls `BillingFacade.issue_invoice(...)` from outside `billing`; each test runs in a transaction that is rolled back |
| `end-to-end` | `pytest` with `django.test.Client`, marker `end_to_end` | `POST /api/v1/invoices` through the whole application |

## Commands

| Stage | Command | What it does |
|---|---|---|
| `build` | `pip install -r requirements.txt && python -m compileall -q app` | Resolves dependencies, and turns a syntax error into a build failure rather than a runtime one |
| `boundary check` | `lint-imports` | Reads `.importlinter` from the repository root, before any test runs |
| `test` | `pytest -m "unit or module_integration" --cov=app --cov-report=xml` | The two layers the stage owns. **NFR-07** — 80% on changed files, 90% on the `billing` module — is then read off `coverage.xml`, file by file. `diff-cover coverage.xml --compare-branch=origin/dev --fail-under=80` is the closest gate this toolchain ships, and it scores changed *lines*: it approximates the requirement, it does not redefine it |
| `package` | `docker build -t app:$(git rev-parse --short HEAD) .` | One image, tagged with the commit |
| `deploy` | `pytest -m end_to_end` | `end-to-end` against the promoted artifact |
| local | `python manage.py migrate`, then `python manage.py runserver 3000` | Applies pending migrations; serves on port 3000 — the value `.env.example` gives `APP_PORT`, this framework's default |

---

**Related:** [`./README.md`](./README.md) · [`../05-architecture/boundary-enforcement.md`](../05-architecture/boundary-enforcement.md)
