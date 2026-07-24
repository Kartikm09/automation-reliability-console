"""Safe provider fixtures used by API demonstrations and tests."""

from __future__ import annotations

from typing import Any


def demo_events() -> dict[str, dict[str, Any]]:
    return {
        "custom": {
            "event_id": "demo-custom-event-001",
            "event_timestamp": "2026-07-24T08:00:07Z",
            "event_type": "run.completed",
            "schema_version": "2",
            "workflow_id": "demo-custom-workflow",
            "workflow_name": "CRM Contact Deduplication",
            "run_id": "demo-custom-run-001",
            "status": "succeeded",
            "trigger_type": "schedule",
            "started_at": "2026-07-24T08:00:00Z",
            "ended_at": "2026-07-24T08:00:07Z",
            "input_summary": {"records": 24},
            "output_summary": {"deduplicated": 3, "unchanged": 21},
        },
        "n8n": {
            "id": "demo-n8n-event-001",
            "timestamp": "2026-07-24T08:05:06Z",
            "version": "1",
            "event": "execution.failed",
            "execution": {
                "id": "demo-n8n-run-001",
                "startedAt": "2026-07-24T08:05:00Z",
                "stoppedAt": "2026-07-24T08:05:06Z",
                "status": "error",
                "mode": "webhook",
                "workflow": {"id": "demo-n8n-workflow", "name": "Customer Support Triage"},
                "error": {"code": "SYNTHETIC_LIMIT", "message": "Synthetic rate limit."},
            },
        },
        "make": {
            "event_id": "demo-make-event-001",
            "occurred_at": "2026-07-24T08:10:05Z",
            "schema_version": "1",
            "event_type": "execution.finished",
            "execution": {
                "execution_id": "demo-make-run-001",
                "started_at": "2026-07-24T08:10:00Z",
                "finished_at": "2026-07-24T08:10:05Z",
                "status": "success",
                "scenario": {"id": "demo-make-workflow", "name": "Invoice Synchronization"},
            },
        },
        "zapier": {
            "event_id": "demo-zapier-event-001",
            "timestamp": "2026-07-24T08:15:05Z",
            "schema_version": "1",
            "event_type": "task.completed",
            "task": {
                "id": "demo-zapier-run-001",
                "started_at": "2026-07-24T08:15:00Z",
                "completed_at": "2026-07-24T08:15:05Z",
                "status": "completed",
                "zap": {"id": "demo-zapier-workflow", "name": "Lead Enrichment Pipeline"},
            },
        },
    }
