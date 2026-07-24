-- Server-side webhook and queue workers use the service role. Bypassing RLS
-- does not bypass ordinary PostgreSQL table privileges, so grant only the
-- direct data access required by those workers.
grant select, update
on public.integration_sources
to service_role;

grant select, update
on public.webhook_credentials
to service_role;

grant select, insert, update
on public.raw_execution_events
to service_role;
