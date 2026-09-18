# 13 — Observability

> [!NOTE] INSTRUCTIONS
> Replace the metric and signal names below with this project's real
> logging and monitoring tool once it is chosen; keep the `correlationId`
> field regardless of tool, because the runbook depends on it. Delete this
> block once a second person has reviewed it against a real log sample.

## Structured logs

Every log line is JSON with at least these fields:

| Field | Meaning |
|---|---|
| `timestamp` | ISO 8601, UTC |
| `level` | `INFO`, `WARN`, or `ERROR` |
| `correlationId` | Generated once per incoming request; carried through every module the request crosses |
| `module` | The module-internal logger namespace that emitted the line — `catalog`, `billing`, or `app` |
| `message` | What happened, without sensitive data |

A `correlationId` is what makes a log line useful when the symptom shows up
in `billing` but the cause sits in `catalog`: filtering on it recovers the
whole request across the module boundaries it crossed, inside the one
process — there is no second process to carry it to. **NFR-09** requires
every unhandled error logged with its `correlationId` and a timestamp; a
stack trace with neither satisfies it.

## Minimum metrics

| Metric | Type | Why |
|---|---|---|
| `http_requests_total` | Counter, by route and status | Traffic volume and error rate |
| `http_request_duration_seconds` | Histogram, by route | Checks **NFR-01**'s 300 ms threshold |
| `invoice_issued_total` | Counter | Business signal behind `HU-04` |

## Health checks

| Endpoint | Reports | Never reports |
|---|---|---|
| `GET /health` | This one application's own process and its required dependencies (e.g. the database) | A per-module status, or any other instance's status |

## Signal → where it's seen → who looks at it

| Signal | Where it's seen | Who looks at it |
|---|---|---|
| Unhandled error rate | Log aggregator, filtered on `level: ERROR` | On-call engineer |
| `/health` failing | Uptime monitor from **NFR-03** | On-call engineer |
| p95 latency over threshold | Metrics dashboard | Tech lead, before each release |
| A support question about one invoice | Logs filtered by that invoice's `correlationId` | Support engineer, per **NFR-10** |

---

**Related:** [`./runbook.md`](./runbook.md) · [`../04-requirements/non-functional.md`](../04-requirements/non-functional.md)
