# INC-[NNN] — [Incident Title]

> [!NOTE] INSTRUCTIONS
> Copy this file once per incident, starting the moment it is detected —
> not after it is resolved. Bracketed placeholders are expected here and
> are not a violation of the no-placeholder rule the rest of the repository
> follows. Assign the next unused `INC-NNN`; ids are never reused.

## Identification

| Field | Value |
|---|---|
| Id | INC-[NNN] |
| Severity | [Critical — application down / Major — one module unusable / Minor — degraded, workaround exists] |
| Detected by | [alert name from `./observability.md`, or "user report"] |
| Modules involved | [`catalog`, `billing`, or "the whole application"] |

## Timeline

| Time (UTC) | Event |
|---|---|
| [HH:MM] | [Detected — how, and by whom] |
| [HH:MM] | [Action taken, from `./runbook.md`] |
| [HH:MM] | [Resolved — the observable proof, e.g. `/health` green again] |

## Impact

[Who was affected, for how long, and what they could not do — one or two
sentences, no more.]

## Root cause

[The actual mechanism, traced to a module or to the pipeline — "the cause
was never found" is not an acceptable final entry.]

## Corrective actions

| Action | Owner | Due |
|---|---|---|
| [A concrete change that prevents recurrence] | [Name] | [date] |

---

**Related:** [`./runbook.md`](./runbook.md) · [`./observability.md`](./observability.md)
