# 10 — Environments

> [!NOTE] INSTRUCTIONS
> An environment with no row below is an environment nobody can reason
> about — add the row before the first deploy to it, not after. Delete
> this block once every pipeline-deployed environment below has taken a
> real deploy from `ci-cd.md`.

## Environments

| Environment | Purpose | Data source | Who deploys |
|---|---|---|---|
| `local` | One developer's own machine, per [`local-setup.md`](./local-setup.md) | Seed data created locally | The developer, manually |
| `staging` | Proves the artifact before real users see it; where the `end-to-end` layer runs | An anonymized copy of production | The pipeline, automatically, on every merge to `dev` |
| `production` | Serves real users | The live database | The pipeline, on a release tag, after manual approval |

## Configuration per environment

| Environment | Values come from | Rule |
|---|---|---|
| `local` | [`.env.example`](../.env.example), copied to `.env` | Never committed — see [`security-policy.md`](../00-governance/security-policy.md) |
| `staging`, `production` | The deployment platform's secret store | Never a file in this repository, not even encrypted |

No environment hardcodes a value that another environment sets
differently — a value that never changes across the row above belongs in
the application's own defaults, not in per-environment configuration.

## Reaching an environment

Nobody reaches `production` directly to fix something. A fix lands on
`dev`, proves itself in `staging` through the same pipeline every other
change uses, and only then reaches `production` — the same path, every
time, with no shortcut for an emergency.

---

**Related:** [`./ci-cd.md`](./ci-cd.md) · [`../00-governance/security-policy.md`](../00-governance/security-policy.md)
