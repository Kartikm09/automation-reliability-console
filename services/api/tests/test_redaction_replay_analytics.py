from __future__ import annotations

from uuid import UUID

from arc_api.adapters import normalize_event
from arc_api.analytics import summarize_runs
from arc_api.demo import demo_events
from arc_api.models import AnalyticsInput, Provider, ReplayRequest
from arc_api.redaction import redact_mapping
from arc_api.replay import simulate_replay


def test_nested_secrets_are_redacted() -> None:
    value = {
        "safe": "value",
        "nested": {"password": "never expose", "count": 2},
        "service_role_key": "never expose",
    }

    result = redact_mapping(value)

    assert result["safe"] == "value"
    assert result["service_role_key"] == "[REDACTED]"
    assert result["nested"]["password"] == "[REDACTED]"


def test_replay_is_explicitly_synthetic_and_side_effect_free() -> None:
    result = simulate_replay(
        ReplayRequest(
            replay_request_id=UUID("11111111-1111-4111-8111-111111111111"),
            original_run_id=UUID("22222222-2222-4222-8222-222222222222"),
            attempt_number=2,
            input_summary={"count": 5, "secret": "redact"},
        )
    )

    assert result["mode"] == "synthetic"
    assert result["external_side_effects"] is False
    assert result["attempt_number"] == 3
    assert result["input_summary"]["secret"] == "[REDACTED]"


def test_analytics_are_calculated_from_run_data() -> None:
    runs = [
        normalize_event(Provider(provider), payload) for provider, payload in demo_events().items()
    ]

    summary = summarize_runs(AnalyticsInput(runs=runs))

    assert summary.total_runs == 4
    assert summary.success_rate == 75.0
    assert summary.failed_runs == 1
    assert summary.timed_out_runs == 0
    assert summary.average_duration_ms == 5750.0


def test_empty_analytics_are_well_defined() -> None:
    summary = summarize_runs(AnalyticsInput(runs=[]))

    assert summary.total_runs == 0
    assert summary.success_rate == 0.0
    assert summary.average_duration_ms is None
