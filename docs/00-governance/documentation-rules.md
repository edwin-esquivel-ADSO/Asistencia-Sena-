# 00 — Documentation Rules

> [!NOTE] INSTRUCTIONS
> This document defines when a document in this repository is considered done.
> It is the only document you should not delete the instructions from — it governs
> the others. Adapt the thresholds to your team, but keep them explicit.

## Document lifecycle

| State | Meaning | Marker |
|---|---|---|
| Empty | Only the INSTRUCTIONS block | file as shipped |
| Draft | Content written, not reviewed | INSTRUCTIONS block still present |
| Done | Reviewed by a second person | INSTRUCTIONS block deleted |

A document is **not** done because it has text in it. It is done when someone
other than the author has read it and the instructions block is gone.

## Rules

1. **One question per document.** If a document answers two questions, split it.
2. **25-80 lines.** Below 25 the document is a stub; above 80 it holds two topics.
3. **Tables and diagrams over prose.** Prose is for the "why" only.
4. **Every claim is falsifiable.** "The system must be fast" is not a requirement;
   "p95 under 300 ms at 50 concurrent users" is.
5. **Links are relative.** Absolute links break when the repository is forked.
6. **English.** One working language for the whole repository — a term defined
   once and then translated in a second document quietly becomes two terms.

## Review checklist

- [ ] The document answers the question in its section README table
- [ ] No unresolved placeholder markers or invented data
- [ ] Every relative link resolves
- [ ] Diagrams render on GitHub
- [ ] The INSTRUCTIONS block is deleted

---

**Related:** [`definition-of-done.md`](./definition-of-done.md) · [`README.md`](./README.md)
