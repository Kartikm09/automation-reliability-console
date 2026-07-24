"""Deterministic replay simulation for the public reference implementation."""

from __future__ import annotations

from typing import Any

from arc_api.models import ReplayRequest
from arc_api.redaction import redact_mapping


def simulate_replay(request: ReplayRequest) -> dict[str, Any]:
    """Return a deterministic result without calling an external automation."""

    return {
        "mode": "synthetic",
        "outcome": "succeeded",
        "replay_request_id": str(request.replay_request_id),
        "original_run_id": str(request.original_run_id),
        "attempt_number": request.attempt_number + 1,
        "input_summary": redact_mapping(request.input_summary),
        "external_side_effects": False,
    }
