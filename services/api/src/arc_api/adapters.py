"""Provider-specific adapters for synthetic execution payloads."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from arc_api.models import (
    CanonicalEvent,
    CanonicalStep,
    Provider,
    RunStatus,
    SafeError,
    StepStatus,
)
from arc_api.redaction import redact_mapping


class AdapterError(ValueError):
    """Raised when a provider payload cannot be normalized safely."""


STATUS_MAP = {
    "cancelled": RunStatus.CANCELLED,
    "completed": RunStatus.SUCCEEDED,
    "error": RunStatus.FAILED,
    "failed": RunStatus.FAILED,
    "finished": RunStatus.SUCCEEDED,
    "pending": RunStatus.QUEUED,
    "queued": RunStatus.QUEUED,
    "running": RunStatus.RUNNING,
    "success": RunStatus.SUCCEEDED,
    "succeeded": RunStatus.SUCCEEDED,
    "timeout": RunStatus.TIMED_OUT,
    "timed_out": RunStatus.TIMED_OUT,
    "waiting": RunStatus.QUEUED,
}


def _record(value: Any, field: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise AdapterError(f"{field} must be an object")
    return value


def _optional_record(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _required_text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise AdapterError(f"{field} is required")
    return value.strip()


def _status(value: Any) -> RunStatus:
    normalized = str(value or "").lower().replace("-", "_")
    try:
        return STATUS_MAP[normalized]
    except KeyError as error:
        raise AdapterError(f"unsupported run status: {normalized or 'missing'}") from error


def _timestamp(value: Any, field: str, *, required: bool = False) -> datetime | None:
    if value in (None, ""):
        if required:
            raise AdapterError(f"{field} is required")
        return None
    if not isinstance(value, str):
        raise AdapterError(f"{field} must be an ISO timestamp")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise AdapterError(f"{field} must be an ISO timestamp") from error
    return parsed.astimezone(UTC)


def _integer(value: Any, default: int = 1) -> int:
    return (
        value if isinstance(value, int) and not isinstance(value, bool) and value >= 0 else default
    )


def _safe_error(value: Any, payload: dict[str, Any]) -> SafeError:
    source = value if isinstance(value, dict) else {}
    return SafeError(
        code=source.get("code") or payload.get("error_code"),
        message=source.get("message") or payload.get("error_message"),
    )


def _steps(value: Any) -> list[CanonicalStep]:
    if not isinstance(value, list):
        return []
    result: list[CanonicalStep] = []
    for index, raw_step in enumerate(value[:200]):
        step = _record(raw_step, f"steps[{index}]")
        normalized_step_status = str(step.get("status", "")).lower().replace("-", "_")
        try:
            step_status = StepStatus(normalized_step_status)
        except ValueError as error:
            raise AdapterError(
                f"unsupported step status: {normalized_step_status or 'missing'}"
            ) from error
        started_at = _timestamp(step.get("started_at") or step.get("startedAt"), "step.started_at")
        ended_at = _timestamp(step.get("ended_at") or step.get("stoppedAt"), "step.ended_at")
        duration = step.get("duration_ms")
        step_input = _optional_record(step.get("input_summary"))
        step_output = _optional_record(step.get("output_summary"))
        result.append(
            CanonicalStep(
                external_step_id=str(
                    step.get("id") or step.get("external_step_id") or f"step-{index + 1}"
                ),
                sequence_number=_integer(
                    step.get("sequence_number") or step.get("sequence"), index + 1
                ),
                name=str(step.get("name") or step.get("label") or f"Step {index + 1}"),
                step_type=str(step.get("type") or step.get("step_type") or "action"),
                status=step_status,
                started_at=started_at,
                ended_at=ended_at,
                duration_ms=duration if isinstance(duration, int) and duration >= 0 else None,
                attempt_number=max(
                    1, _integer(step.get("attempt_number") or step.get("attempt"), 1)
                ),
                input_summary=redact_mapping(step_input),
                output_summary=redact_mapping(step_output),
                error=_safe_error(step.get("error"), step),
            )
        )
    return result


def _canonical(
    provider: Provider,
    payload: dict[str, Any],
    *,
    event_id: Any,
    event_timestamp: Any,
    event_type: Any,
    workflow_id: Any,
    workflow_name: Any,
    run_id: Any,
    status: Any,
    started_at: Any,
    ended_at: Any,
    attempt: Any,
    trigger: Any,
    input_summary: Any,
    output_summary: Any,
    error: Any,
    steps: Any,
    schema_version: Any,
    metadata: Any,
    summary: Any,
) -> CanonicalEvent:
    started = _timestamp(started_at, "started_at")
    ended = _timestamp(ended_at, "ended_at")
    if started and ended and ended < started:
        raise AdapterError("ended_at cannot be earlier than started_at")
    warnings = [] if schema_version else ["source_schema_version_missing"]
    duration = int((ended - started).total_seconds() * 1000) if started and ended else None
    canonical_timestamp = _timestamp(event_timestamp, "event_timestamp", required=True)
    if canonical_timestamp is None:
        raise AdapterError("event_timestamp is required")
    return CanonicalEvent(
        provider=provider,
        external_event_id=event_id if isinstance(event_id, str) else None,
        external_workflow_id=_required_text(workflow_id, "external_workflow_id"),
        workflow_name=str(workflow_name or workflow_id),
        external_run_id=_required_text(run_id, "external_run_id"),
        event_type=str(event_type or "run.updated"),
        run_status=_status(status),
        event_timestamp=canonical_timestamp,
        started_at=started,
        ended_at=ended,
        duration_ms=duration,
        attempt_number=max(1, _integer(attempt, 1)),
        trigger_type=str(trigger or "unknown"),
        input_summary=redact_mapping(input_summary if isinstance(input_summary, dict) else {}),
        output_summary=redact_mapping(output_summary if isinstance(output_summary, dict) else {}),
        error=_safe_error(error, payload),
        steps=_steps(steps),
        source_schema_version=str(schema_version or "unknown"),
        metadata=redact_mapping(metadata if isinstance(metadata, dict) else {}),
        warnings=warnings,
        summary=summary if isinstance(summary, str) else None,
    )


def normalize_event(provider: Provider, raw_payload: dict[str, Any]) -> CanonicalEvent:
    """Normalize one provider event while tolerating unknown additional fields."""

    payload = _record(raw_payload, "payload")
    if provider is Provider.CUSTOM:
        return _canonical(
            provider,
            payload,
            event_id=payload.get("event_id"),
            event_timestamp=payload.get("event_timestamp"),
            event_type=payload.get("event_type"),
            workflow_id=payload.get("workflow_id"),
            workflow_name=payload.get("workflow_name"),
            run_id=payload.get("run_id"),
            status=payload.get("status"),
            started_at=payload.get("started_at"),
            ended_at=payload.get("ended_at"),
            attempt=payload.get("attempt_number"),
            trigger=payload.get("trigger_type"),
            input_summary=payload.get("input_summary"),
            output_summary=payload.get("output_summary"),
            error=payload.get("error"),
            steps=payload.get("steps"),
            schema_version=payload.get("schema_version"),
            metadata=payload.get("metadata"),
            summary=payload.get("summary"),
        )
    if provider is Provider.N8N:
        execution = _record(payload.get("execution", payload), "execution")
        workflow = _optional_record(execution.get("workflow"))
        return _canonical(
            provider,
            payload,
            event_id=payload.get("id") or execution.get("eventId"),
            event_timestamp=payload.get("timestamp")
            or execution.get("stoppedAt")
            or execution.get("startedAt"),
            event_type=payload.get("event"),
            workflow_id=workflow.get("id") or execution.get("workflowId"),
            workflow_name=workflow.get("name"),
            run_id=execution.get("id"),
            status=execution.get("status")
            or ("success" if execution.get("finished") else "running"),
            started_at=execution.get("startedAt"),
            ended_at=execution.get("stoppedAt"),
            attempt=2 if execution.get("retryOf") else 1,
            trigger=execution.get("mode"),
            input_summary=execution.get("input"),
            output_summary=execution.get("output"),
            error=execution.get("error"),
            steps=execution.get("steps"),
            schema_version=payload.get("version"),
            metadata={"mode": execution.get("mode")},
            summary=execution.get("summary"),
        )
    if provider is Provider.MAKE:
        execution = _record(payload.get("execution", payload), "execution")
        scenario = _optional_record(execution.get("scenario"))
        return _canonical(
            provider,
            payload,
            event_id=payload.get("event_id"),
            event_timestamp=payload.get("occurred_at") or execution.get("started_at"),
            event_type=payload.get("event_type"),
            workflow_id=scenario.get("id") or execution.get("scenario_id"),
            workflow_name=scenario.get("name"),
            run_id=execution.get("execution_id") or execution.get("id"),
            status=execution.get("status"),
            started_at=execution.get("started_at"),
            ended_at=execution.get("finished_at"),
            attempt=execution.get("attempt"),
            trigger=execution.get("trigger"),
            input_summary=execution.get("input"),
            output_summary=execution.get("output"),
            error=execution.get("error"),
            steps=execution.get("operations"),
            schema_version=payload.get("schema_version"),
            metadata=execution.get("metadata"),
            summary=execution.get("summary"),
        )
    task = _record(payload.get("task", payload), "task")
    zap = _optional_record(task.get("zap"))
    return _canonical(
        provider,
        payload,
        event_id=payload.get("event_id"),
        event_timestamp=payload.get("timestamp") or task.get("started_at"),
        event_type=payload.get("event_type"),
        workflow_id=zap.get("id") or task.get("zap_id"),
        workflow_name=zap.get("name"),
        run_id=task.get("id"),
        status=task.get("status"),
        started_at=task.get("started_at"),
        ended_at=task.get("completed_at"),
        attempt=task.get("attempt"),
        trigger=task.get("trigger"),
        input_summary=task.get("input"),
        output_summary=task.get("output"),
        error=task.get("error"),
        steps=task.get("steps"),
        schema_version=payload.get("schema_version"),
        metadata=task.get("metadata"),
        summary=task.get("summary"),
    )
