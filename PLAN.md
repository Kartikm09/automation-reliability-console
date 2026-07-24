# Automation Reliability Console - Delivery Plan

## Objective

Build and verify an independent, multi-tenant reference implementation for
observing automation runs, ingesting signed provider events, handling incidents,
requesting replays, and preserving an append-only audit trail.

## Delivery phases

| Phase                | Work                                                                                                          | Exit gate                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1. Foundation        | Monorepo, toolchains, contracts, local Supabase configuration, CI                                             | Install, format, and static checks run locally                 |
| 2. Data and security | PostgreSQL schema, constraints, RLS, role helpers, state transitions, Storage and Realtime policies           | pgTAP role and cross-tenant tests pass                         |
| 3. Event pipeline    | Signed webhook ingestion, immutable raw events, queues, provider normalization, deduplication, incident rules | Valid, duplicate, malformed, and out-of-order fixtures pass    |
| 4. Operations        | Incident transitions, replay workflow, approvals, artifacts, notifications, audit events                      | Transaction and authorization tests pass                       |
| 5. Product UI        | Auth, organization context, dashboards, workflows, runs, incidents, approvals, integrations, audit, settings  | Vitest and accessibility-focused component tests pass          |
| 6. End-to-end QA     | Seeded fictional scenario, browser tests, screenshots, security review                                        | Critical workflow and tenant-denial tests pass                 |
| 7. Deployment        | Dedicated Supabase project, Edge Functions, web/API deployment where authenticated                            | Hosted smoke checks pass or exact provider blocker is recorded |
| 8. Publication       | Secret scan, documentation reconciliation, clean commits, GitHub repository                                   | Public URL resolves and repository state matches reports       |

## Quality gates

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
python -m pytest
supabase test db
deno test
docker compose build
```

Each report records the exact commands actually run. A command is not reported
as passing unless its exit status and output were inspected.

## Scope controls

- All organizations, people, workflows, events, and artifacts are synthetic.
- Webhook and service credentials are stored only in local secret stores or
  hosted environment configuration.
- Billing changes and paid infrastructure are out of scope without approval.
- FastAPI handles processing and analytics; ordinary tenant CRUD remains in
  Supabase behind RLS.
- Hosted status is stated conservatively in `DEPLOYMENT_REPORT.md`.

## Completion evidence

- `TEST_REPORT.md` contains test counts, failures, skips, and limitations.
- `SECURITY.md` contains RLS, Storage, secret, dependency, and bundle checks.
- `DEPLOYMENT_REPORT.md` contains only verified endpoints and hosted resources.
- `PORTFOLIO_NOTES.md` contains truthful interview-ready claims.
