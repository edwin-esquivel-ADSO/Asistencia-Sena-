# 04 — Non-Functional Requirements

> [!NOTE] INSTRUCTIONS
> Every row needs a number and a way to check it. "The system must be secure"
> is not a row here; "zero unauthenticated writes, verified by an automated
> test" is. Delete this block once a second person has reviewed the thresholds.

## What makes a requirement here valid

| Not this | This |
|---|---|
| The system must be fast | p95 under 300 ms at 50 concurrent users |
| The system must be secure | Zero write endpoints accept an unauthenticated request |

## Requirements

| NFR-NN | Category | Threshold | How it is measured |
|---|---|---|---|
| NFR-01 | Performance | p95 response time under 300 ms at 50 concurrent users, on catalog and billing read endpoints | Scripted load test against staging before each release |
| NFR-02 | Performance | Daily sales summary for a full day of invoices renders in under 10 seconds | Timed run against the staging dataset before release |
| NFR-03 | Availability | 99.5% uptime per month, measured across the published business-hours support window | Uptime monitor polling `/health` every 5 minutes |
| NFR-04 | Availability | Database restore from the latest backup completes in under 30 minutes | Quarterly restore drill, timed and logged |
| NFR-05 | Security | 100% of write endpoints (register/retire product, issue invoice, record payment) reject an unauthenticated request | Automated authorization test suite, run in CI on every pull request |
| NFR-06 | Security | Zero critical- or high-severity dependency findings merged without a written, expiring waiver | CI dependency-scan gate, see [`security-policy.md`](../00-governance/security-policy.md) |
| NFR-07 | Maintainability | Unit test coverage at least 80% on changed files, at least 90% on the `billing` module | CI coverage gate, see [`definition-of-done.md`](../00-governance/definition-of-done.md) |
| NFR-08 | Maintainability | A developer runs the application locally in under 1 hour, start to first successful request | Timed onboarding checklist signed off by the tech lead |
| NFR-09 | Observability | 100% of unhandled errors are logged with a request id and a timestamp | Manual log sample reviewed at every release |
| NFR-10 | Observability | A support question about one invoice is answered from logs alone in under 5 minutes | Quarterly support drill, timed |

## Identifier format

`NFR-NN` — same two-digit, sequential, never-reused convention as `HU-NN`.

---

**Related:** [`../00-governance/documentation-rules.md`](../00-governance/documentation-rules.md) · [`./traceability-matrix.md`](./traceability-matrix.md)
