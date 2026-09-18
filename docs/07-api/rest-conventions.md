# 07 — REST Conventions

> [!NOTE] INSTRUCTIONS
> This governs the one HTTP API the application exposes — not a module's
> in-process public API, which is a different thing defined in
> `module-boundaries.md`. Delete this block once an endpoint ships using it.

## One API, not one per module

The application exposes exactly one HTTP API to its clients. A module's
public API (`CatalogFacade`, `BillingFacade`) is an in-process boundary
between modules, defined in
[`module-boundaries.md`](../02-domain/module-boundaries.md) — it is never
called over HTTP, and it does not get its own version number. Versioning
below applies once, to the whole application.

| Element | Convention | Example |
|---|---|---|
| Base path | `/api/v{n}` | `/api/v1` |
| Version bump | A breaking change to any endpoint's request or response bumps `{n}` for the whole API | `/api/v1` → `/api/v2` |

## Resource naming

| Rule | Example |
|---|---|
| Plural nouns, not verbs | `/api/v1/products`, not `/api/v1/getProducts` |
| Nesting shows ownership | `/api/v1/invoices/{id}/payments` — payments belong to one invoice |
| kebab-case in multi-word paths | `/api/v1/invoice-lines` |

## Status codes

| Code | When |
|---|---|
| 200 / 201 / 204 | Success reading, creating, or with no response body |
| 400 / 422 | The request is malformed, or well-formed but fails a business rule (`BR-NN`) |
| 401 / 403 | No credentials, or credentials without permission |
| 404 | The resource, or its parent in a nested path, does not exist |
| 409 | The request conflicts with the resource's current state — e.g. `BR-03`, a payment against an already-paid invoice |
| 500 | The application failed to handle the request at all — an unhandled error, logged with its `correlationId` per **NFR-09** |

## Error format

```json
{ "error": "VALIDATION_ERROR", "message": "price must not be negative",
  "details": [{ "field": "price", "message": "must be >= 0" }] }
```

Every non-2xx response uses this shape. `error` is a stable machine code;
`message` is for humans; `details` is present only for 400/422.

## Pagination

List endpoints paginate with `?page=1&limit=20` (`limit` capped at 100).
That default keeps `catalog` and `billing` list endpoints inside the p95
budget set by **NFR-01**, without a second, competing number here.

---

**Related:** [`../06-data/models.md`](../06-data/models.md) · [`./contracts/openapi/_template-api.yaml`](./contracts/openapi/_template-api.yaml)
