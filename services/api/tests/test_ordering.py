from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from arc_api.models import RunStatus
from arc_api.ordering import decide_event_order

NOW = datetime(2026, 7, 24, tzinfo=UTC)


@pytest.mark.parametrize(
    ("current", "incoming"),
    [
        (RunStatus.QUEUED, RunStatus.RUNNING),
        (RunStatus.QUEUED, RunStatus.SUCCEEDED),
        (RunStatus.RUNNING, RunStatus.FAILED),
        (RunStatus.RUNNING, RunStatus.TIMED_OUT),
    ],
)
def test_legal_transitions_are_applied(
    current: RunStatus,
    incoming: RunStatus,
) -> None:
    decision = decide_event_order(
        current_status=current,
        current_event_at=NOW,
        incoming_status=incoming,
        incoming_event_at=NOW + timedelta(seconds=1),
    )

    assert decision.apply
    assert decision.reason == "legal_transition"


def test_older_event_cannot_overwrite_terminal_state() -> None:
    decision = decide_event_order(
        current_status=RunStatus.SUCCEEDED,
        current_event_at=NOW,
        incoming_status=RunStatus.RUNNING,
        incoming_event_at=NOW - timedelta(seconds=1),
    )

    assert not decision.apply
    assert decision.reason == "out_of_order_terminal_state"


def test_terminal_state_cannot_change_even_with_newer_event() -> None:
    decision = decide_event_order(
        current_status=RunStatus.FAILED,
        current_event_at=NOW,
        incoming_status=RunStatus.SUCCEEDED,
        incoming_event_at=NOW + timedelta(seconds=1),
    )

    assert not decision.apply
    assert decision.reason == "illegal_state_transition"


def test_same_state_refresh_is_idempotent() -> None:
    decision = decide_event_order(
        current_status=RunStatus.RUNNING,
        current_event_at=NOW,
        incoming_status=RunStatus.RUNNING,
        incoming_event_at=NOW,
    )

    assert decision.apply
    assert decision.reason == "same_state_refresh"
