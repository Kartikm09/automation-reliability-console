# Deployment Report

Updated: 2026-07-24

| Component                  | Status                                                       | Verification                                     |
| -------------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| Dedicated Supabase project | `automation-reliability-console` is active and isolated      | Hosted Auth, Data API, Storage, Realtime, Queues |
| SQL migrations             | Five hosted migrations; local and hosted pgTAP suites pass   | 86 assertions in each environment                |
| Edge Functions             | Seven functions deployed; imports, auth, smoke checks pass   | Hosted function gateway                          |
| Background processing      | Three durable queues and encrypted Vault-backed Cron active  | Scheduled worker invocation returned HTTP 200    |
| React frontend             | Nginx and Cloudflare/Sites builds pass six browser journeys  | Public Sites publication pending                 |
| FastAPI                    | Image healthy; 35 tests pass; public provider unavailable    | `http://127.0.0.1:8000` locally                  |
| GitHub repository          | Publication pending final commit and public URL verification | Local repository only                            |

## Remaining External Work

- Publish the already validated frontend build and verify the production URL.
- Configure the final Auth callback origin after the public URL is assigned.
- Publish GitHub after the production smoke test.
- Deploy FastAPI when an authenticated container provider is available. The
  current environment has no authenticated Render, Railway, Fly.io, or
  equivalent server provider, so no public API URL is claimed.

Hosted project references, passwords, tokens, and keys are kept outside this
repository. This report intentionally does not present pending URLs as live.
