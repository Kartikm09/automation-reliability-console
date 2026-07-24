# Portfolio Notes

## What It Does

The application accepts signed automation events, preserves the source payload,
normalizes provider formats, tracks runs and steps, creates incidents, controls
replays, protects private artifacts, and records an audit trail per organization.

## Why I Built It

It demonstrates the backend-to-frontend engineering needed when operational data
is unreliable or changes shape over time. The stable canonical model lets the
product evolve without losing source evidence.

## What I Designed

I independently designed and implemented the schema, migrations, RLS model,
provider adapters, Edge Functions, FastAPI service, React workflows, durable job
handling, synthetic fixtures, documentation, and automated tests. This is public
proof of work, not a claim of customer deployment.

## Supabase Features

Auth, PostgreSQL, forced RLS, private Storage, signed URLs, Edge Functions,
private Realtime Broadcast, PGMQ, pg_cron, migrations, generated types, and
pgTAP.

## How RLS Works

Every business row has an organization boundary. Membership helpers resolve the
current authenticated user and role. Sensitive transitions execute through
transactional functions after checking the role. Tests switch JWT identities to
prove owner, admin, operator, viewer, suspended, anonymous, and cross-tenant
behavior.

## Changing Payloads

Provider-specific fields are accepted only by adapters. Unknown fields are
tolerated, required identity fields are validated, warnings are recorded, and
safe summaries are redacted. The original event remains immutable for later
review or reprocessing.

## Idempotency

Raw events use provider event IDs with a payload-hash fallback. Canonical runs
use source plus external run ID. Replay requests use organization plus
idempotency key. Replayed runs use the replay request ID and remain linked to the
original.

## AI-Assisted Engineering

AI tooling accelerated implementation, but output was validated through strict
types, static analysis, migration resets, adversarial RLS tests, unit tests,
browser workflows, Docker builds, secret scans, and direct inspection of
generated artifacts.

## Compromises

Provider payloads and replay execution are synthetic. In-app notifications are
complete; external email and paid provider credentials are excluded. FastAPI
deployment depends on an authenticated external container host.

## At Production Scale

I would add managed observability, per-source rate limits, key-rotation overlap,
partitioned raw event retention, incident deduplication windows, provider SDK
contract tests, backup restoration drills, and an independently reviewed threat
model.
