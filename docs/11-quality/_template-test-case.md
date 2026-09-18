# TC-[NNN] — [Test Case Title]

> [!NOTE] INSTRUCTIONS
> Copy this file once per test case; never edit it in place. Bracketed
> placeholders are expected here and are not a violation of the
> no-placeholder rule the rest of the repository follows. Assign the next
> unused `TC-NNN` — ids are never reused.

## Identification

| Field | Value |
|---|---|
| Id | TC-[NNN] |
| Covers | [`HU-NN` or `NFR-NN` — see `../04-requirements/`] |
| Layer | [`unit` / `module-integration` / `end-to-end` — see `./testing-strategy.md`] |
| Module | [`catalog`, `billing`, or "whole artifact" for `end-to-end`] |

## Preconditions

- [The state that must exist before step 1 — a row already in the
  database, a prior action already taken, a specific configuration.]
- [A second precondition, or delete this line if one is enough.]

## Steps

1. [An action, stated so precisely that two people would perform it identically.]
2. [The next action, if any.]

## Expected result

[The single observable outcome that proves the behavior: a return value,
a status code, a persisted row, a rejected request — not a restatement
of the steps.]

---

**Related:** [`./testing-strategy.md`](./testing-strategy.md) · [`../04-requirements/traceability-matrix.md`](../04-requirements/traceability-matrix.md)
