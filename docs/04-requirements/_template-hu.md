# HU-[NN] — [Story Title]

> [!NOTE] INSTRUCTIONS
> Copy this file once per story; never edit it in place. Bracketed
> placeholders are expected here and are not a violation of the
> no-placeholder rule the rest of the repository follows. Assign the next
> unused `HU-NN` — ids are never reused.

## Story

**As** [role — e.g. catalog staff, billing staff, store manager]
**I want** [the action they take]
**so that** [the business benefit, not a restatement of the action]

## Acceptance criteria

```gherkin
Scenario: [happy path]
  Given [the initial state]
  When  [the action]
  Then  [the observable, verifiable result]

Scenario: [edge case tied to a business rule, e.g. BR-01]
  Given [a state that should block the action]
  When  [the same action is attempted]
  Then  [the rejection, and the message shown]
```

## Affected module and requirements

| Field | Value |
|---|---|
| Module | [`catalog` or `billing`; see `../02-domain/module-boundaries.md`] |
| Applicable NFR(s) | [the `NFR-NN` ids this story must satisfy; see `./non-functional.md`] |
| Business rule(s) touched | [the `BR-NN` ids, or "none"; see `../02-domain/entities-and-rules.md`] |

## Definition of ready

This story does not enter sprint planning until it meets
[`definition-of-ready.md`](../00-governance/definition-of-ready.md) in full.

- [ ] [anything specific to this story the general checklist would not catch — delete this line if there is nothing to add]

---

**Related:** [`./user-stories.md`](./user-stories.md) · [`../02-domain/module-boundaries.md`](../02-domain/module-boundaries.md)
