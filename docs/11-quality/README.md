# 11 — Quality

> [!NOTE] INSTRUCTIONS
> Read this before filling in any document in this section.
> Delete this block once every document in the section is complete.

## Purpose

This section defines what gets tested, at which of three layers, and how
a test is written before the code it verifies — the quality contract
every pull request is measured against.

## Documents

| Document | Answers | Priority |
|---|---|---|
| [testing-strategy.md](./testing-strategy.md) | What is tested, and at what layer? | ⭐ |
| [tdd-guide.md](./tdd-guide.md) | How is a test written before the code? | ⭐ |
| [_template-test-case.md](./_template-test-case.md) | Template — copy it once per test case | — |

## Out of scope

Consumer-driven contract tests between independently deployed services,
distributed tracing across services, and load testing across a service
mesh or an API gateway. A `module-integration` test here exercises one
module's public API in-process; it never makes a network call to a
separately deployed process, because there isn't one.

Distributed-system concerns belong to the [microservices governance framework](https://github.com/jesusarielgb-works/microservices-governance-framework).

## Ready when

- [ ] Every document in this section has its INSTRUCTIONS block removed
- [ ] Every `HU-NN` and `NFR-NN` has at least one test case copied from `_template-test-case.md`
- [ ] The `test` stage in [`../10-devops/ci-cd.md`](../10-devops/ci-cd.md) runs the `unit` and `module-integration` layers and fails below NFR-07's threshold
- [ ] `traceability-matrix.md`'s Gaps section resolves to real test-case ids, not layer names

---

**Related:** [`../10-devops/README.md`](../10-devops/README.md) · [`../04-requirements/README.md`](../04-requirements/README.md)
