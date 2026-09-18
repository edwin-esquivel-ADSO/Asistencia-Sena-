# 04 — Traceability Matrix

> [!NOTE] INSTRUCTIONS
> Every `HU-NN` and every `NFR-NN` must appear at least once below, pointing at
> the module that implements it, the document that designs it, and the test that
> would fail if it broke. A requirement with no row here is one nobody verifies.
> Delete this block once every row resolves to a real document and test.

## How to read these tables

`Requirement -> Module -> Design document -> Test case`. Both tables read that
way: the first closes every `HU-NN`, the second every `NFR-NN`. A cell may point
at a section filled in later than this one — that forward link is expected, not
a defect.

## Stories

| HU-NN | Module | Design document | Test case |
|---|---|---|---|
| HU-01 | `catalog` | [`module-catalog.md`](../09-modules/module-catalog.md) | [`unit`](../11-quality/testing-strategy.md) — reject a negative price |
| HU-02 | `catalog` | [`module-catalog.md`](../09-modules/module-catalog.md) | [`module-integration`](../11-quality/testing-strategy.md) — a retired product is blocked from a new invoice (BR-01) |
| HU-03 | `catalog` | [`module-catalog.md`](../09-modules/module-catalog.md) | [`unit`](../11-quality/testing-strategy.md) — a category with active products cannot be deleted (BR-04) |
| HU-04 | `billing` | [`module-catalog.md`](../09-modules/module-catalog.md) | [`module-integration`](../11-quality/testing-strategy.md) — a later price change does not alter an issued invoice (BR-02) |
| HU-05 | `billing` | [`module-catalog.md`](../09-modules/module-catalog.md) | [`unit`](../11-quality/testing-strategy.md) — a payment is rejected once the invoice is `paid` (BR-03) |
| HU-06 | `billing` | [`module-catalog.md`](../09-modules/module-catalog.md) | [`end-to-end`](../11-quality/testing-strategy.md) — the summary total equals the sum of the day's issued invoices |

Every Design document cell above names the same file because the per-module
documents it would otherwise point at do not exist yet: `09-modules/` carries no
module folder, only its catalog and the
[`_template-module/`](../09-modules/_template-module/README.md) a folder is
copied from. Once `catalog/` and `billing/` exist there, each story points at its
own module's folder and the column starts telling the stories apart.

## Non-functional requirements

| NFR-NN | Module | Design document | Test case |
|---|---|---|---|
| NFR-01 | whole artifact | [`observability.md`](../13-operations/observability.md) — the request-duration histogram | Scripted load test against staging, before each release |
| NFR-02 | `billing` | [`models.md`](../06-data/models.md) — `invoices` and its issued date | Timed run against the staging dataset |
| NFR-03 | whole artifact | [`observability.md`](../13-operations/observability.md) — `GET /health` | Uptime monitor polling `/health` every 5 minutes |
| NFR-04 | whole artifact | none yet — see Gaps | Quarterly restore drill, timed and logged |
| NFR-05 | `catalog`, `billing` | [`rest-conventions.md`](../07-api/rest-conventions.md) — the 401/403 rules | Automated authorization suite, in CI on every pull request |
| NFR-06 | whole artifact | [`security-policy.md`](../00-governance/security-policy.md) — dependency scanning | CI dependency-scan gate |
| NFR-07 | whole artifact | [`definition-of-done.md`](../00-governance/definition-of-done.md) — the coverage threshold | CI coverage gate on every pull request |
| NFR-08 | whole artifact | [`local-setup.md`](../10-devops/local-setup.md) — the prerequisites and steps | Timed onboarding run, signed off by the tech lead |
| NFR-09 | whole artifact | [`observability.md`](../13-operations/observability.md) — the structured log fields | Log sample reviewed at every release |
| NFR-10 | whole artifact | [`observability.md`](../13-operations/observability.md) — the `correlationId` lookup | Quarterly support drill, timed |

Every row above is proved by a gate, a monitor, a timed run or a scheduled drill
rather than by a story scenario, and some of them run outside the three layers in
[`testing-strategy.md`](../11-quality/testing-strategy.md), which says exactly
that of **NFR-01**. Each still earns a `TC-NNN` copied from
[`_template-test-case.md`](../11-quality/_template-test-case.md), with that check
written into its Steps.

## Gaps

A gap is an `HU-NN` or `NFR-NN` with no row above, or a row whose design
document or test case does not exist. One is open: **NFR-04** sets a 30-minute
restore target that no document in this repository describes a procedure for.

Once a real test case exists for a row, its Test case column should carry
that test case's `Id` from [`_template-test-case.md`](../11-quality/_template-test-case.md), in place of the layer or check named above.

---

**Related:** [`./user-stories.md`](./user-stories.md) · [`./non-functional.md`](./non-functional.md)
