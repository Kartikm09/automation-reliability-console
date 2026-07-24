"""FastAPI entry point for reusable execution processing."""

from __future__ import annotations

import hmac
import json
import logging
import time
from contextvars import ContextVar
from typing import Annotated, Any
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from arc_api import __version__
from arc_api.adapters import AdapterError, normalize_event
from arc_api.analytics import summarize_runs
from arc_api.config import Settings
from arc_api.demo import demo_events
from arc_api.gateway import SupabaseGateway
from arc_api.incidents import detect_incident
from arc_api.models import (
    AnalyticsInput,
    IncidentInput,
    ProcessEventRequest,
    ReplayRequest,
)
from arc_api.replay import simulate_replay

correlation_context: ContextVar[str] = ContextVar("correlation_id", default="")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return json.dumps(
            {
                "timestamp": self.formatTime(record),
                "level": record.levelname.lower(),
                "message": record.getMessage(),
                "correlation_id": correlation_context.get(),
            },
            separators=(",", ":"),
        )


def configure_logging(level: str) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)


def create_app(settings: Settings | None = None) -> FastAPI:
    runtime_settings = settings or Settings.from_environment()
    configure_logging(runtime_settings.log_level)
    application = FastAPI(
        title="Automation Reliability Console API",
        version=__version__,
        docs_url="/docs",
        redoc_url=None,
    )
    application.state.settings = runtime_settings
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(runtime_settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-Correlation-ID", "X-Internal-Token"],
    )

    @application.middleware("http")
    async def request_context(request: Request, call_next: Any) -> Response:
        correlation_id = request.headers.get("x-correlation-id", "")
        if len(correlation_id) != 36:
            correlation_id = str(uuid4())
        token = correlation_context.set(correlation_id)
        started = time.monotonic()
        try:
            response = await call_next(request)
            response.headers["x-correlation-id"] = correlation_id
            logging.getLogger(__name__).info(
                "request_completed method=%s path=%s status=%s duration_ms=%s",
                request.method,
                request.url.path,
                response.status_code,
                round((time.monotonic() - started) * 1000, 2),
            )
            return response
        finally:
            correlation_context.reset(token)

    async def require_internal_token(
        x_internal_token: Annotated[str | None, Header()] = None,
    ) -> None:
        expected = runtime_settings.internal_api_token
        if (
            len(expected) < 16
            or not x_internal_token
            or not hmac.compare_digest(expected, x_internal_token)
        ):
            raise HTTPException(status_code=401, detail="Internal token is invalid.")

    @application.exception_handler(AdapterError)
    async def adapter_error_handler(_request: Request, error: AdapterError) -> Response:
        return JSONResponse(
            status_code=422,
            content={
                "error": {"code": "invalid_provider_payload", "message": str(error)},
                "correlation_id": correlation_context.get(),
            },
        )

    @application.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @application.get("/ready")
    async def ready() -> dict[str, bool | str]:
        return {
            "status": "ready",
            "supabase_configured": runtime_settings.supabase_configured,
        }

    @application.get("/version")
    async def version() -> dict[str, str]:
        return {"name": "automation-reliability-api", "version": __version__}

    @application.post(
        "/internal/process-event",
        dependencies=[Depends(require_internal_token)],
    )
    async def process_event(request: ProcessEventRequest) -> dict[str, Any]:
        canonical = normalize_event(request.provider, request.payload)
        if not runtime_settings.supabase_configured:
            return {
                "mode": "validation_only",
                "canonical_event": canonical.model_dump(mode="json"),
            }
        result = await SupabaseGateway(runtime_settings).rpc(
            "apply_canonical_event",
            {
                "target_raw_event_id": str(request.raw_event_id),
                "canonical": canonical.model_dump(mode="json"),
            },
        )
        return {"mode": "applied", "result": result}

    @application.post(
        "/internal/process-replay",
        dependencies=[Depends(require_internal_token)],
    )
    async def process_replay(request: ReplayRequest) -> dict[str, Any]:
        return simulate_replay(request)

    @application.post(
        "/internal/recalculate-incident",
        dependencies=[Depends(require_internal_token)],
    )
    async def recalculate_incident(request: IncidentInput) -> dict[str, Any]:
        decision = detect_incident(request)
        return {
            "create": decision.create,
            "severity": decision.severity,
            "title": decision.title,
            "summary": decision.summary,
        }

    @application.post(
        "/internal/analytics",
        dependencies=[Depends(require_internal_token)],
    )
    async def analytics(request: AnalyticsInput) -> dict[str, Any]:
        return summarize_runs(request).model_dump(mode="json")

    @application.post(
        "/internal/generate-demo-events",
        dependencies=[Depends(require_internal_token)],
    )
    async def generate_demo_events() -> dict[str, dict[str, Any]]:
        return demo_events()

    return application


app = create_app()
