# Security

## Supported Scope

This repository is a defensive portfolio reference implementation using
fictional data. Report suspected security issues privately through GitHub's
security advisory flow. Do not include credentials or personal data in reports.

## Controls

- Forced RLS on all application tables.
- Explicit organization membership and role helpers.
- Cross-tenant pgTAP tests for select and mutation paths.
- No browser grant on credential hashes or raw event insertion.
- HMAC-SHA-256 over the timestamp and exact raw request body.
- Five-minute webhook replay window and 1 MiB request limit.
- One-time plaintext credentials; prefix and SHA-256 hash persisted.
- Narrow `SECURITY DEFINER` functions with explicit `search_path`.
- Append-only audit and incident event tables.
- Private Storage with MIME, size, extension, path, and role restrictions.
- Short-lived signed artifact URLs created from an authorized record.
- Private organization Realtime topics with RLS authorization.
- Internal FastAPI and queue endpoints protected by server-only tokens.
- Structured logs omit credentials and unrestricted payloads.

## Local Execution Warning

Supabase local development and Docker Compose are not hardened sandboxes.
Only run trusted code and synthetic fixtures. Default local Supabase keys are
public development values and must never be reused in a hosted environment.

## Review Checklist

- [x] Secrets excluded from tracked environment files
- [x] Browser bundle accepts only publishable Supabase configuration
- [x] Credential-bearing base table hidden from browser roles
- [x] Business tables use forced RLS
- [x] Raw events are immutable after insertion
- [x] Audit history rejects ordinary writes
- [x] Storage bucket is private
- [x] Signed URLs require record-backed authorization
- [x] Role escalation and suspended membership are tested
- [x] Dependencies are scanned in CI
- [x] Hosted artifact, tenant isolation, Realtime, and worker smoke tests pass

The hosted checks use environment-controlled synthetic accounts and never write
credentials into the repository or browser bundle.
