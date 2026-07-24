# ADR 001: Separate Edge and FastAPI Responsibilities

Status: Accepted

Edge Functions own Supabase-native boundaries: webhook acceptance, authenticated
credential commands, replay requests, approvals, signed artifact access, and
small queue-consumer triggers.

FastAPI owns reusable heavier logic: provider normalization, redaction, event
ordering, incident rules, replay simulation, and analytics.

This avoids duplicating normal browser CRUD, keeps public ingress close to the
database and queue, and preserves a portable Python processing layer. The cost
is two server runtimes and explicit shared-contract tests.
