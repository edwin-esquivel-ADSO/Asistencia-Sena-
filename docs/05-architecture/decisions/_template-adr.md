# ADR-[NNN] — [Decision Title]

> [!NOTE] INSTRUCTIONS
> Copy this file to `records/ADR-NNN-short-title.md`; never edit it in place.
> Every relative path below is written from `records/`, where the copy lives.
> Bracketed placeholders are expected here and are not a violation of the
> no-placeholder rule the rest of the repository follows. Fill in the
> alternatives honestly — an ADR with one alternative is a justification
> written after the fact, not a decision record.

## Identification

| Field | Value |
|---|---|
| Id | ADR-[NNN] |
| Date | [YYYY-MM-DD — the day the status last changed] |
| Status | [`Proposed` / `Accepted` / `Rejected` / `Superseded by ADR-NNN`] |
| Authors | [names of the people accountable for the decision] |
| Supersedes | [ADR-NNN, or "none"] |

## Context

[What forces the decision now, in three to five sentences. What breaks if it is
not decided. Name the requirements that constrain it — `HU-NN`, `NFR-NN`, or a
`BR-NN` rule from `../../../02-domain/entities-and-rules.md`.]

| Constraint | Source |
|---|---|
| [the constraint, stated as a fact, not a preference] | [`NFR-NN`, a stakeholder, a budget, a deadline] |

## Decision

**We decided:** [one sentence, in the present tense, that a reader can act on.]

[Two or three sentences on the tiebreaker: what made this option win over the
runner-up, not a list of everything good about it.]

## Alternatives evaluated

| Alternative | Pros | Cons | Verdict |
|---|---|---|---|
| [Option A — the chosen one] | [what it buys] | [what it costs] | Chosen |
| [Option B] | [what it buys] | [what it costs] | [the one fact that ruled it out] |
| [Option C] | [what it buys] | [what it costs] | [the one fact that ruled it out] |

## Consequences

| Kind | Consequence |
|---|---|
| Positive | [something that becomes easier, stated concretely] |
| Positive | [something that becomes cheaper or safer] |
| Cost | [work this decision creates, including who pays it] |
| Risk | [what could go wrong, and the signal that it is going wrong] |

**Documents to update:** [the paths this decision changes, or "none"]

## Revisiting

[The condition under which this decision is reopened — a number, a date, or an
observable event. "If it becomes a problem" is not a condition.]

---

**Related:** [`../README.md`](../README.md) · [`../../README.md`](../../README.md)
