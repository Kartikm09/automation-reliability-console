from __future__ import annotations

import pytest

from arc_api.adapters import AdapterError, normalize_event
from arc_api.demo import demo_events
from arc_api.models import Provider, RunStatus


@pytest.mark.parametrize("provider", list(Provider))
def test_each_provider_normalizes(provider: Provider) -> None:
    event = normalize_event(provider, demo_events()[provider.value])

    assert event.provider is provider
    assert event.external_run_id
    assert event.external_workflow_id
    assert event.event_timestamp.tzinfo is not None


def test_custom_summary_is_redacted() -> None:
    payload = demo_events()["custom"]
    payload["input_summary"]["api_token"] = "portfolio-safe-secret"

    event = normalize_event(Provider.CUSTOM, payload)

    assert event.input_summary["api_token"] == "[REDACTED]"
    assert event.input_summary["records"] == 24


def test_unknown_fields_are_tolerated() -> None:
    payload = {**demo_events()["custom"], "future_schema_field": {"value": 1}}

    event = normalize_event(Provider.CUSTOM, payload)

    assert event.run_status is RunStatus.SUCCEEDED


@pytest.mark.parametrize(
    ("provider", "payload", "message"),
    [
        (Provider.CUSTOM, [], "payload must be an object"),
        (Provider.N8N, {"execution": "bad"}, "execution must be an object"),
        (
            Provider.MAKE,
            {
                "execution": {"execution_id": "id", "status": "mystery"},
                "occurred_at": "2026-07-24T09:00:00Z",
            },
            "external_workflow_id is required",
        ),
        (
            Provider.ZAPIER,
            {
                "task": {"id": "run", "status": "completed"},
                "timestamp": "2026-07-24T09:00:00Z",
            },
            "external_workflow_id is required",
        ),
    ],
)
def test_malformed_payloads_are_rejected(
    provider: Provider,
    payload: object,
    message: str,
) -> None:
    with pytest.raises(AdapterError, match=message):
        normalize_event(provider, payload)  # type: ignore[arg-type]


def test_invalid_timestamp_is_rejected() -> None:
    payload = {**demo_events()["custom"], "event_timestamp": "not-a-date"}

    with pytest.raises(AdapterError, match="event_timestamp must be an ISO timestamp"):
        normalize_event(Provider.CUSTOM, payload)


def test_ended_before_started_is_rejected() -> None:
    payload = {
        **demo_events()["custom"],
        "started_at": "2026-07-24T09:00:00Z",
        "ended_at": "2026-07-24T08:00:00Z",
    }

    with pytest.raises(ValueError, match="ended_at cannot be earlier"):
        normalize_event(Provider.CUSTOM, payload)
