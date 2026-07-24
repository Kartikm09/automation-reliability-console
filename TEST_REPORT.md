# Test Report

Updated: 2026-07-24

| Suite                   | Result                    | Evidence                                                     |
| ----------------------- | ------------------------- | ------------------------------------------------------------ |
| pgTAP local             | 86 passed                 | schema, RLS, states, service grants, encrypted Cron          |
| pgTAP hosted            | 86 passed                 | same suite against the dedicated hosted project              |
| FastAPI Pytest          | 35 passed                 | adapters, ordering, incidents, redaction, replay, endpoints  |
| Deno format/lint/check  | Passed                    | shared modules and seven function entrypoints                |
| Deno unit tests         | 8 passed                  | crypto and four provider normalizers                         |
| Web Vitest              | 7 passed                  | components and formatting                                    |
| TypeScript build/lint   | Passed                    | strict references, ESLint, Vite and Cloudflare builds        |
| Python static checks    | Passed                    | Ruff and strict Mypy                                         |
| Playwright E2E          | 6 passed in three targets | Vite, Nginx, Sites build; desktop and mobile                 |
| Hosted authorization    | Passed                    | artifact signing, tenant denial, private Broadcast rejection |
| Hosted queue worker     | Passed                    | Vault-backed Cron invocation returned HTTP 200               |
| Docker Compose          | Passed                    | API healthy; production frontend served                      |
| Secret/dependency scans | Passed                    | 172 source/built files; npm audit found no vulnerabilities   |

## Commands Executed

```bash
npx supabase test db
npx supabase test db --linked --dns-resolver https
pytest services/api
npm run test:edge
deno lint --config supabase/functions/deno.json supabase/functions
deno check --config supabase/functions/deno.json supabase/functions/*/index.ts
npm test --workspace @arc/web
npm run lint
npm run typecheck
npm run build
node scripts/check-secrets.mjs
node scripts/verify-hosted.mjs
ruff check services/api
mypy services/api/src
docker compose build
docker compose up -d
npm run test:e2e
```

The FastAPI tests emit one upstream Starlette deprecation warning about its
current `TestClient` transport. It does not affect test behavior.

The hosted pgTAP suite is transactionally isolated and tolerates additional
synthetic records created by browser tests.
