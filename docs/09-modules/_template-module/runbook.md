# [module-name] — Runbook

> [!NOTE] INSTRUCTIONS
> Copy this whole `_template-module/` folder once per module; never edit the
> template in place. Bracketed placeholders are expected here and are not a
> violation of the no-placeholder rule the rest of the repository follows.
> Write for whoever is on call: no step should require asking someone else
> what a command means.

## Symptoms this module can cause

| Symptom | Likely cause inside this module |
|---|---|
| [observable symptom, e.g. "invoices stuck in `draft`"] | [the module-internal reason] |

## Diagnosis

| Step | How |
|---|---|
| Isolate the module | Filter application logs for the `[module-name]` logger namespace |
| Reproduce | Call `[Module]Facade` directly from a REPL or test, bypassing the UI |
| Check the data | Query this module's own tables — see [`./data-model.md`](./data-model.md) — never another module's |

## Recovery

| Situation | Action |
|---|---|
| Bad data inside this module's tables | Fix it through `[Module]Facade`, never a direct `UPDATE` — the facade enforces the invariants in [`./data-model.md`](./data-model.md) |
| A code defect | Ship a fix through the single release pipeline; there is no way to redeploy this module alone |

There is one process and one release: recovering this module never means
restarting it independently, only the whole application.

## Escalation

| When | Escalate to |
|---|---|
| [The fix would touch another module's data] | [Tech lead — a cross-module fix needs a facade change, not a workaround] |
| [The cause is still unknown after diagnosis] | [Whoever last changed `internal/` here — see git blame] |

---

**Related:** [`./README.md`](./README.md) · [`../../13-operations/README.md`](../../13-operations/README.md)
