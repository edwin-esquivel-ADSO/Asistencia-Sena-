# 10 — Local Setup

> [!NOTE] INSTRUCTIONS
> NFR-08 sets the budget this document must fit inside: one hour, start to
> first successful request. Time yourself following it on a machine with
> nothing installed. Delete this block once someone outside the team has
> done that, unaided, inside the hour.

## Prerequisites

| Tool | Why | Verify with |
|---|---|---|
| Git | Clone the repository | `git --version` |
| PostgreSQL (local instance, or run in a container) | The one database this application uses — see [`database-conventions.md`](../06-data/database-conventions.md) | `psql --version` |
| This project's language runtime and package manager | Build and run the application | See [`_stacks/README.md`](../_stacks/README.md) for the exact tool and version |

## Steps

1. Clone the repository and enter it.
2. Copy [`.env.example`](../.env.example) to `.env`; the defaults match a
   fresh local PostgreSQL instance and need no edits to start. `APP_PORT` is
   3000 — this framework's default port, used by every example URL here and by
   the API contract template. A stack whose framework names the port something
   else says so in its own guide under [`_stacks/`](../_stacks/README.md).
3. Create the local database named in `DATABASE_URL`.
4. Install dependencies with this project's package manager — see
   [`_stacks/README.md`](../_stacks/README.md).
5. Run the pending migrations — see
   [`migrations.md`](../06-data/migrations.md).
6. Start the application with this project's run command — see
   [`_stacks/README.md`](../_stacks/README.md).

## Verifying it worked

```bash
curl -i http://localhost:3000/api/v1/products
```

A `200` response, even with an empty list, means the process is up,
reading `.env`, and reaching the database through `catalog`'s public API.
Anything else is a setup defect in this document, not in the application —
fix the document in the same pull request that fixes the step.

The whole sequence above, start to this first successful request, is
**NFR-08**'s one-hour budget. A run that takes longer is a gap in this
document, reported the same way a bug is.

---

**Related:** [`./ci-cd.md`](./ci-cd.md) · [`../06-data/database-conventions.md`](../06-data/database-conventions.md)
