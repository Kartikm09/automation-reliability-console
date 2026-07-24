"""Pydantic contracts for provider and canonical execution events."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Provider(StrEnum):
    CUSTOM = "custom"
    N8N = "n8n"
    MAKE = "make"
    ZAPIER = "zapier"


class RunStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMED_OUT = "timed_out"


class StepStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    SKIPPED = "skipped"
    TIMED_OUT = "timed_out"


class SafeError(BaseModel):
    model_config = ConfigDict(extra="ignore")

    code: str | None = Field(default=None, max_length=120)
    message: str | None = Field(default=None, max_length=500)


class CanonicalStep(BaseModel):
    model_config = ConfigDict(extra="forbid")

    external_step_id: str = Field(min_length=1, max_length=200)
    sequence_number: int = Field(ge=0)
    name: str = Field(min_length=1, max_length=200)
    step_type: str = Field(default="action", max_length=80)
    status: StepStatus
    started_at: datetime | None = None
    ended_at: datetime | None = None
    duration_ms: int | None = Field(default=None, ge=0)
    attempt_number: int = Field(default=1, ge=1)
    input_summary: dict[str, Any] = Field(default_factory=dict)
    output_summary: dict[str, Any] = Field(default_factory=dict)
    error: SafeError = Field(default_factory=SafeError)


class CanonicalEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: Provider
    external_event_id: str | None = Field(default=None, max_length=240)
    external_workflow_id: str = Field(min_length=1, max_length=240)
    workflow_name: str = Field(min_length=1, max_length=240)
    external_run_id: str = Field(min_length=1, max_length=240)
    event_type: str = Field(min_length=1, max_length=120)
    run_status: RunStatus
    event_timestamp: datetime
    started_at: datetime | None = None
    ended_at: datetime | None = None
    duration_ms: int | None = Field(default=None, ge=0)
    attempt_number: int = Field(default=1, ge=1)
    trigger_type: str = Field(default="unknown", max_length=80)
    input_summary: dict[str, Any] = Field(default_factory=dict)
    output_summary: dict[str, Any] = Field(default_factory=dict)
    error: SafeError = Field(default_factory=SafeError)
    steps: list[CanonicalStep] = Field(default_factory=list, max_length=200)
    source_schema_version: str = Field(default="unknown", max_length=40)
    metadata: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list, max_length=50)
    summary: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_time_order(self) -> CanonicalEvent:
        if self.started_at and self.ended_at and self.ended_at < self.started_at:
            raise ValueError("ended_at cannot be earlier than started_at")
        return self


class ProcessEventRequest(BaseModel):
    raw_event_id: UUID
    provider: Provider
    payload: dict[str, Any]


class ReplayRequest(BaseModel):
    replay_request_id: UUID
    original_run_id: UUID
    attempt_number: int = Field(default=1, ge=1)
    input_summary: dict[str, Any] = Field(default_factory=dict)


class IncidentInput(BaseModel):
    workflow_name: str
    status: RunStatus
    error: SafeError = Field(default_factory=SafeError)
    duration_ms: int | None = None
    expected_sla_seconds: int | None = None


class AnalyticsInput(BaseModel):
    runs: list[CanonicalEvent] = Field(max_length=5000)


class AnalyticsSummary(BaseModel):
    total_runs: int
    success_rate: float
    average_duration_ms: float | None
    failed_runs: int
    timed_out_runs: int
