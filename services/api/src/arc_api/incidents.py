"""Deterministic incident-detection rules."""

from __future__ import annotations

from dataclasses import dataclass

from arc_api.models import IncidentInput, RunStatus


@dataclass(frozen=True, slots=True)
class IncidentDecision:
    create: bool
    severity: str | None
    title: str | None
    summary: str | None


def detect_incident(value: IncidentInput) -> IncidentDecision:
    if value.status is RunStatus.TIMED_OUT:
        return IncidentDecision(
            True,
            "high",
            f"{value.workflow_name} timed out",
            value.error.message or "The workflow exceeded its expected completion window.",
        )
    if value.status is RunStatus.FAILED:
        severity = "high" if (value.error.code or "").upper().startswith("SECURITY_") else "medium"
        return IncidentDecision(
            True,
            severity,
            f"{value.workflow_name} failed",
            value.error.message or "The workflow run requires operator review.",
        )
    if (
        value.status is RunStatus.SUCCEEDED
        and value.duration_ms is not None
        and value.expected_sla_seconds is not None
        and value.duration_ms > value.expected_sla_seconds * 1000
    ):
        return IncidentDecision(
            True,
            "low",
            f"{value.workflow_name} exceeded expected duration",
            "The run completed, but exceeded its configured SLA.",
        )
    return IncidentDecision(False, None, None, None)
