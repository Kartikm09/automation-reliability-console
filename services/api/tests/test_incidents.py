from __future__ import annotations

import pytest

from arc_api.incidents import detect_incident
from arc_api.models import IncidentInput, RunStatus, SafeError


@pytest.mark.parametrize(
    ("status", "expected_severity"),
    [
        (RunStatus.FAILED, "medium"),
        (RunStatus.TIMED_OUT, "high"),
    ],
)
def test_failed_states_create_incidents(
    status: RunStatus,
    expected_severity: str,
) -> None:
    result = detect_incident(
        IncidentInput(
            workflow_name="Synthetic Workflow",
            status=status,
            error=SafeError(code="DEMO", message="Synthetic failure"),
        )
    )

    assert result.create
    assert result.severity == expected_severity


def test_security_failure_is_high_severity() -> None:
    result = detect_incident(
        IncidentInput(
            workflow_name="Synthetic Workflow",
            status=RunStatus.FAILED,
            error=SafeError(code="SECURITY_POLICY", message="Synthetic policy failure"),
        )
    )

    assert result.severity == "high"


def test_slow_success_creates_low_severity_incident() -> None:
    result = detect_incident(
        IncidentInput(
            workflow_name="Synthetic Workflow",
            status=RunStatus.SUCCEEDED,
            duration_ms=11_000,
            expected_sla_seconds=10,
        )
    )

    assert result.create
    assert result.severity == "low"


def test_healthy_success_does_not_create_incident() -> None:
    result = detect_incident(
        IncidentInput(
            workflow_name="Synthetic Workflow",
            status=RunStatus.SUCCEEDED,
            duration_ms=9_000,
            expected_sla_seconds=10,
        )
    )

    assert not result.create
