# ADR-001 — Modular Monolith as the Default Architecture

> [!NOTE] INSTRUCTIONS
> This record ships with the framework already accepted: it is the reason the
> rest of `05-architecture/` is written the way it is. Confirm it applies to
> this project, or supersede it with a new record that names it. Delete this
> block once that confirmation has happened at the architecture gate.

## Identification

| Field | Value |
|---|---|
| Id | ADR-001 |
| Date | 2026-09-12 |
| Status | Accepted |
| Authors | Tech lead and team, at the architecture review gate |
| Supersedes | none |

## Context

A team must know, before the first commit, whether code is organized by
business area or by technical layer. The decision is cheap now and expensive
later: the folder tree, the test layout, the build check and every import in
the codebase follow from it, and changing it means moving files that several
people are editing at once.

| Constraint | Source |
|---|---|
| One deployable, one database, one release pipeline | [`../../../01-context/overview.md`](../../../01-context/overview.md) |
| Two bounded contexts already exist: catalog and billing | [`../../../02-domain/domain-map.md`](../../../02-domain/domain-map.md) |
| A three-person team, no dedicated operations hire | [`../../../03-product/vision.md`](../../../03-product/vision.md) |
| A developer reaches a first successful request in under 1 hour | `NFR-08` |

## Decision

**We decided:** organize the application as a **modular monolith** — one
deployable divided into modules, each with a public API and internals nothing
outside may import — and keep **flat layered architecture** as a documented
variant for a project whose domain map holds a single bounded context.

The tiebreaker was the domain map, not size. Two contexts with different
vocabulary and different owners were already drawn there, and the boundary is
far cheaper to draw before the code exists than after. Where a project has one
context, the variant is chosen on its merits and is not a lesser option.

## Alternatives evaluated

| Alternative | Pros | Cons | Verdict |
|---|---|---|---|
| Modular monolith by default, flat layers as a documented variant | Boundary matches the domain map; blast radius of a change is one folder; the rule is machine-checkable | Two documented shapes to teach instead of one | Chosen |
| Flat layered architecture, for every project | Simplest tree; fastest start; no extra tooling | With two contexts, one file becomes the junction every feature edits, and business areas blur into each other | Kept as the variant below the threshold, rejected as the default |
| Modules with enforced boundaries from day one, on every project | One rule everywhere; nothing to migrate later | Draws boundaries before the domain is understood and freezes them in the wrong place; the ceremony lands hardest on the smallest projects | Rejected |

## Consequences

| Kind | Consequence |
|---|---|
| Positive | A change to billing stays inside one folder, so a reviewer sees its reach in the diff |
| Positive | The boundary is checked by the build, not remembered by a reviewer |
| Cost | One rule file and one `boundary check` stage per project to maintain |
| Cost | A module's public API is a real interface; widening it is a review conversation, not a quick edit |
| Risk | Modules drawn too small become layers with extra ceremony — the warning sign is a facade with twenty methods |

**Documents to update:** none; this record is why
[`../../modular-monolith.md`](../../modular-monolith.md) and
[`../../layered-architecture.md`](../../layered-architecture.md) exist.

## Revisiting

Reopened when a module's public API is widened three times in one quarter —
the sign the boundary sits in the wrong place. The growth path this decision
sets runs from the variant to the default and ends there; what lies beyond the
edge of that path is listed in [`../../README.md`](../../README.md).

---

**Related:** [`../README.md`](../README.md) · [`../../modular-monolith.md`](../../modular-monolith.md)
