# Deployment

## Supabase

1. Link a dedicated project with `supabase link --project-ref <ref>`.
2. Run `supabase db push --dry-run`, then `supabase db push`.
3. Generate browser types with `supabase gen types typescript --linked`.
4. Set `INTERNAL_FUNCTION_TOKEN` through `supabase secrets set`.
5. Deploy functions with
   `supabase functions deploy --import-map supabase/functions/deno.json`.
6. Store the worker URL, publishable key, and internal token in Supabase Vault
   under the names documented in the scheduled-worker migration.
7. Verify private buckets, Cron, queues, RLS, Auth URLs, and Realtime policies.

No database password or service key belongs in this repository.

## FastAPI

Build with:

```bash
docker build -t automation-reliability-api services/api
docker run --env-file .env -p 8000:8000 automation-reliability-api
```

Hosted deployment requires a provider account that can store server-side
`SUPABASE_SECRET_KEY` and `INTERNAL_API_TOKEN` values and check `/ready`.

## Web

The web image compiles publishable Supabase configuration into a Vite build and
serves it with Nginx. Auth Site URL and callback redirects must match the final
origin. The browser must never receive a Supabase secret or service-role key.

`npm run build:sites --workspace @arc/web` creates the separate
Cloudflare-compatible SPA bundle used for portfolio hosting. Its post-build
sanitizer removes local development variables before packaging.

Verified results and public URLs are recorded only in
[DEPLOYMENT_REPORT.md](DEPLOYMENT_REPORT.md).
