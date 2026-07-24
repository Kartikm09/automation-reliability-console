# Processing API

FastAPI handles canonical event validation, provider adapters, event ordering,
incident rules, replay simulation, redaction, analytics, and queue-job
processing. Browser CRUD remains in Supabase behind Row Level Security.

```bash
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/pytest
.venv/bin/uvicorn arc_api.main:app --reload
```

Internal endpoints require `X-Internal-Token`. Server-only Supabase credentials
must never be sent to a browser.
