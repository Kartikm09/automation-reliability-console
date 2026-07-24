# Testing

## Test Layers

| Layer          | Command                                      | Focus                                                       |
| -------------- | -------------------------------------------- | ----------------------------------------------------------- |
| PostgreSQL     | `npx supabase test db`                       | schema, RLS, roles, state machines, Storage, Realtime       |
| Edge Functions | `npm run test:edge`                          | HMAC, hashing, normalization, invalid input                 |
| FastAPI        | `pytest services/api`                        | adapters, ordering, incidents, replay, redaction, endpoints |
| Web            | `npm test --workspace @arc/web`              | status rendering, controls, formatting                      |
| E2E            | `npm run test:e2e`                           | authentication, operations, direct cross-tenant denial      |
| Static         | `npm run lint`, `mypy`, `ruff`, `deno check` | type and quality gates                                      |
| Build          | `npm run build`, `docker compose build`      | production artifacts                                        |

## Database Isolation

The RLS tests set synthetic JWT claims for owner, administrator, operator,
viewer, suspended, second-tenant, and anonymous contexts. Assertions execute
through the same grants and policies used by PostgREST.

## Authenticated E2E

Passwords are supplied only through runtime environment values. The
`scripts/setup-demo-users.mjs` script updates fixed synthetic IDs after a reset,
making tenant fixtures reproducible without committing a universal password.

## Current Evidence

See [TEST_REPORT.md](TEST_REPORT.md). A command is listed as passing only after
it has run successfully in the recorded environment.
