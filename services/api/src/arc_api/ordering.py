"""Deterministic event ordering and run-state transition rules."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from arc_api.models import RunStatus

LEGAL_TRANSITIONS = {
    RunStatus.QUEUED: {
        RunStatus.RUNNING,
        RunStatus.SUCCEEDED,
        RunStatus.FAILED,
        RunStatus.CANCELLED,
        RunStatus.TIMED_OUT,
    },
    RunStatus.RUNNING: {
        RunStatus.SUCCEEDED,
        RunStatus.FAILED,
        RunStatus.CANCELLED,
        RunStatus.TIMED_OUT,
    },
    RunStatus.SUCCEEDED: set(),
    RunStatus.FAILED: set(),
    RunStatus.CANCELLED: set(),
    RunStatus.TIMED_OUT: set(),
}


@dataclass(frozen=True, slots=True)
class OrderingDecision:
    apply: bool
    reason: str


def decide_event_order(
    *,
    current_status: RunStatus,
    current_event_at: datetime,
    incoming_status: RunStatus,
    incoming_event_at: datetime,
) -> OrderingDecision:
    if incoming_event_at < current_event_at and current_status not in {
        RunStatus.QUEUED,
        RunStatus.RUNNING,
    }:
        return OrderingDecision(False, "out_of_order_terminal_state")
    if incoming_status == current_status:
        return OrderingDecision(True, "same_state_refresh")
    if incoming_status not in LEGAL_TRANSITIONS[current_status]:
        return OrderingDecision(False, "illegal_state_transition")
    return OrderingDecision(True, "legal_transition")
