# Roadmap

Planned work for the next releases. Hours are rough estimates.

## 1. Hosted processing API (about 6 hours)

The FastAPI service is only verified in a local container today.

- Deploy the API container to a public host.
- Connect the hosted queues and Cron worker to it.
- Run the full intake, normalize and replay flow against the live stack.
- Record the results in `DEPLOYMENT_REPORT.md`.

## 2. First real provider integration (about 8 hours)

Provider payloads are synthetic fixtures today.

- Add signed webhook intake for one real automation provider, following its official documentation.
- Verify signatures and reject replayed or expired deliveries.
- Map the provider's execution format to the existing normalized model.
- Keep the synthetic fixtures for tests.

## 3. Real replay with approval (about 5 hours)

Replay only simulates a result today.

- Add an opt-in replay mode that calls a sandbox provider account.
- Require an explicit operator approval before each real replay.
- Log who approved it and what was sent.

## 4. Email notifications (about 4 hours)

Only in-app notifications exist today.

- Add optional email delivery for failed and recovered executions.
- Add per-user notification preferences.

## 5. Load and recovery checks (about 5 hours)

- Add a load test for webhook intake and the processing queue.
- Write and run a backup and restore drill for the database.
- Document the numbers in `TEST_REPORT.md`.

## 6. Operator guide (about 2 hours)

- Write a short guide for daily use and troubleshooting.

Total: about 30 hours.
