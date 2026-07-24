import { InputError } from "./http.ts";

export type RunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "timed_out";

export interface CanonicalStep {
  attempt_number: number;
  duration_ms: number | null;
  ended_at: string | null;
  error: { code: string | null; message: string | null };
  external_step_id: string;
  input_summary: Record<string, unknown>;
  name: string;
  output_summary: Record<string, unknown>;
  sequence_number: number;
  started_at: string | null;
  status: RunStatus | "skipped";
  step_type: string;
}

export interface CanonicalEvent {
  attempt_number: number;
  duration_ms: number | null;
  ended_at: string | null;
  error: { code: string | null; message: string | null };
  event_timestamp: string;
  event_type: string;
  external_event_id: string | null;
  external_run_id: string;
  external_workflow_id: string;
  input_summary: Record<string, unknown>;
  metadata: Record<string, unknown>;
  output_summary: Record<string, unknown>;
  provider: "custom" | "n8n" | "make" | "zapier";
  run_status: RunStatus;
  source_schema_version: string;
  started_at: string | null;
  steps: CanonicalStep[];
  summary: string | null;
  trigger_type: string;
  warnings: string[];
  workflow_name: string;
}

type RecordValue = Record<string, unknown>;

function record(value: unknown, field: string): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InputError(
      "invalid_provider_payload",
      `${field} must be an object.`,
    );
  }
  return value as RecordValue;
}

function text(value: unknown, field: string, required = true): string | null {
  if (value === null || value === undefined || value === "") {
    if (required) {
      throw new InputError("invalid_provider_payload", `${field} is required.`);
    }
    return null;
  }
  if (typeof value !== "string") {
    throw new InputError(
      "invalid_provider_payload",
      `${field} must be a string.`,
    );
  }
  return value;
}

function timestamp(
  value: unknown,
  field: string,
  required = false,
): string | null {
  const candidate = text(value, field, required);
  if (candidate === null) return null;
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.valueOf())) {
    throw new InputError(
      "invalid_provider_payload",
      `${field} must be an ISO timestamp.`,
    );
  }
  return parsed.toISOString();
}

function integer(value: unknown, fallback = 1): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : fallback;
}

function summary(value: unknown): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowedEntries = Object.entries(value as RecordValue)
    .filter(
      ([key]) => !/(password|token|secret|authorization|cookie)/i.test(key),
    )
    .slice(0, 25)
    .map(([key, item]) => [
      key,
      typeof item === "string" ? item.slice(0, 240) : item,
    ]);
  return Object.fromEntries(allowedEntries);
}

function normalizeStatus(value: unknown): RunStatus {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replaceAll("-", "_");
  const mapping: Record<string, RunStatus> = {
    cancelled: "cancelled",
    completed: "succeeded",
    error: "failed",
    failed: "failed",
    finished: "succeeded",
    pending: "queued",
    queued: "queued",
    running: "running",
    success: "succeeded",
    succeeded: "succeeded",
    timeout: "timed_out",
    timed_out: "timed_out",
    waiting: "queued",
  };
  const result = mapping[normalized];
  if (!result) {
    throw new InputError(
      "invalid_provider_payload",
      `Unsupported run status: ${normalized || "missing"}.`,
    );
  }
  return result;
}

function normalizeSteps(value: unknown): CanonicalStep[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 200).map((item, index) => {
    const step = record(item, `steps[${index}]`);
    const stepError = step.error && typeof step.error === "object"
      ? (step.error as RecordValue)
      : {};
    return {
      attempt_number: integer(step.attempt ?? step.attempt_number),
      duration_ms: typeof step.duration_ms === "number" && step.duration_ms >= 0
        ? Math.trunc(step.duration_ms)
        : null,
      ended_at: timestamp(
        step.ended_at ?? step.stoppedAt,
        `steps[${index}].ended_at`,
      ),
      error: {
        code: text(stepError.code ?? step.error_code, "step.error.code", false),
        message: text(
          stepError.message ?? step.error_message,
          "step.error.message",
          false,
        ),
      },
      external_step_id: String(
        step.id ?? step.external_step_id ?? `step-${index + 1}`,
      ),
      input_summary: summary(step.input_summary ?? step.input),
      name: String(step.name ?? step.label ?? `Step ${index + 1}`),
      output_summary: summary(step.output_summary ?? step.output),
      sequence_number: integer(
        step.sequence ?? step.sequence_number,
        index + 1,
      ),
      started_at: timestamp(
        step.started_at ?? step.startedAt,
        `steps[${index}].started_at`,
      ),
      status: String(step.status ?? "").toLowerCase() === "skipped"
        ? "skipped"
        : normalizeStatus(step.status),
      step_type: String(step.type ?? step.step_type ?? "action"),
    };
  });
}

function canonical(
  provider: CanonicalEvent["provider"],
  payload: RecordValue,
  fields: {
    attempt?: unknown;
    endedAt?: unknown;
    error?: unknown;
    eventId?: unknown;
    eventTimestamp?: unknown;
    eventType?: unknown;
    input?: unknown;
    metadata?: unknown;
    output?: unknown;
    runId?: unknown;
    schemaVersion?: unknown;
    startedAt?: unknown;
    status?: unknown;
    steps?: unknown;
    summary?: unknown;
    trigger?: unknown;
    workflowId?: unknown;
    workflowName?: unknown;
  },
): CanonicalEvent {
  const startedAt = timestamp(fields.startedAt, "started_at");
  const endedAt = timestamp(fields.endedAt, "ended_at");
  const error = fields.error && typeof fields.error === "object"
    ? (fields.error as RecordValue)
    : {};
  const warnings: string[] = [];
  if (!fields.schemaVersion) warnings.push("source_schema_version_missing");
  if (startedAt && endedAt && endedAt < startedAt) {
    throw new InputError(
      "invalid_provider_payload",
      "ended_at cannot be earlier than started_at.",
    );
  }
  return {
    attempt_number: integer(fields.attempt),
    duration_ms: startedAt && endedAt
      ? Math.max(
        0,
        new Date(endedAt).valueOf() - new Date(startedAt).valueOf(),
      )
      : null,
    ended_at: endedAt,
    error: {
      code: text(error.code ?? payload.error_code, "error.code", false),
      message: text(
        error.message ?? payload.error_message,
        "error.message",
        false,
      ),
    },
    event_timestamp:
      timestamp(fields.eventTimestamp, "event_timestamp", true) ??
        new Date().toISOString(),
    event_type: String(fields.eventType ?? "run.updated"),
    external_event_id: text(fields.eventId, "external_event_id", false),
    external_run_id: text(fields.runId, "external_run_id", true) as string,
    external_workflow_id: text(
      fields.workflowId,
      "external_workflow_id",
      true,
    ) as string,
    input_summary: summary(fields.input),
    metadata: summary(fields.metadata),
    output_summary: summary(fields.output),
    provider,
    run_status: normalizeStatus(fields.status),
    source_schema_version: String(fields.schemaVersion ?? "unknown"),
    started_at: startedAt,
    steps: normalizeSteps(fields.steps),
    summary: text(fields.summary, "summary", false),
    trigger_type: String(fields.trigger ?? "unknown"),
    warnings,
    workflow_name: String(fields.workflowName ?? fields.workflowId),
  };
}

export function normalizeProviderEvent(
  provider: CanonicalEvent["provider"],
  input: unknown,
): CanonicalEvent {
  const payload = record(input, "payload");

  if (provider === "custom") {
    return canonical(provider, payload, {
      attempt: payload.attempt_number,
      endedAt: payload.ended_at,
      error: payload.error,
      eventId: payload.event_id,
      eventTimestamp: payload.event_timestamp,
      eventType: payload.event_type,
      input: payload.input_summary,
      metadata: payload.metadata,
      output: payload.output_summary,
      runId: payload.run_id,
      schemaVersion: payload.schema_version,
      startedAt: payload.started_at,
      status: payload.status,
      steps: payload.steps,
      summary: payload.summary,
      trigger: payload.trigger_type,
      workflowId: payload.workflow_id,
      workflowName: payload.workflow_name,
    });
  }

  if (provider === "n8n") {
    const execution = record(payload.execution ?? payload, "execution");
    const workflow =
      execution.workflow && typeof execution.workflow === "object"
        ? (execution.workflow as RecordValue)
        : {};
    return canonical(provider, payload, {
      attempt: execution.retryOf ? 2 : 1,
      endedAt: execution.stoppedAt,
      error: execution.error,
      eventId: payload.id ?? execution.eventId,
      eventTimestamp: payload.timestamp ?? execution.stoppedAt ??
        execution.startedAt,
      eventType: payload.event ?? "execution.updated",
      input: execution.input,
      metadata: { mode: execution.mode },
      output: execution.output,
      runId: execution.id,
      schemaVersion: payload.version,
      startedAt: execution.startedAt,
      status: execution.status ?? (execution.finished ? "success" : "running"),
      steps: execution.steps,
      summary: execution.summary,
      trigger: execution.mode,
      workflowId: workflow.id ?? execution.workflowId,
      workflowName: workflow.name,
    });
  }

  if (provider === "make") {
    const execution = record(payload.execution ?? payload, "execution");
    const scenario =
      execution.scenario && typeof execution.scenario === "object"
        ? (execution.scenario as RecordValue)
        : {};
    return canonical(provider, payload, {
      attempt: execution.attempt,
      endedAt: execution.finished_at,
      error: execution.error,
      eventId: payload.event_id,
      eventTimestamp: payload.occurred_at ?? execution.started_at,
      eventType: payload.event_type,
      input: execution.input,
      metadata: execution.metadata,
      output: execution.output,
      runId: execution.execution_id ?? execution.id,
      schemaVersion: payload.schema_version,
      startedAt: execution.started_at,
      status: execution.status,
      steps: execution.operations,
      summary: execution.summary,
      trigger: execution.trigger,
      workflowId: scenario.id ?? execution.scenario_id,
      workflowName: scenario.name,
    });
  }

  const task = record(payload.task ?? payload, "task");
  const zap = task.zap && typeof task.zap === "object"
    ? (task.zap as RecordValue)
    : {};
  return canonical(provider, payload, {
    attempt: task.attempt,
    endedAt: task.completed_at,
    error: task.error,
    eventId: payload.event_id,
    eventTimestamp: payload.timestamp ?? task.started_at,
    eventType: payload.event_type,
    input: task.input,
    metadata: task.metadata,
    output: task.output,
    runId: task.id,
    schemaVersion: payload.schema_version,
    startedAt: task.started_at,
    status: task.status,
    steps: task.steps,
    summary: task.summary,
    trigger: task.trigger,
    workflowId: zap.id ?? task.zap_id,
    workflowName: zap.name,
  });
}
