import { assert, assertEquals, assertThrows } from "@std/assert";
import { normalizeProviderEvent } from "./normalization.ts";

const fixtures = {
  custom: {
    event_id: "event-custom-1",
    event_timestamp: "2026-07-24T08:00:05Z",
    event_type: "run.completed",
    run_id: "run-custom-1",
    schema_version: "2",
    started_at: "2026-07-24T08:00:00Z",
    ended_at: "2026-07-24T08:00:05Z",
    status: "succeeded",
    trigger_type: "webhook",
    workflow_id: "workflow-custom",
    workflow_name: "Custom Demo",
    input_summary: { count: 4, access_token: "must-be-redacted" },
  },
  n8n: {
    id: "event-n8n-1",
    timestamp: "2026-07-24T08:00:05Z",
    version: "1",
    execution: {
      id: "run-n8n-1",
      startedAt: "2026-07-24T08:00:00Z",
      stoppedAt: "2026-07-24T08:00:05Z",
      status: "error",
      workflow: { id: "workflow-n8n", name: "n8n Demo" },
      error: { code: "SYNTHETIC", message: "Synthetic failure" },
    },
  },
  make: {
    event_id: "event-make-1",
    occurred_at: "2026-07-24T08:00:05Z",
    schema_version: "1",
    execution: {
      execution_id: "run-make-1",
      started_at: "2026-07-24T08:00:00Z",
      finished_at: "2026-07-24T08:00:05Z",
      status: "success",
      scenario: { id: "workflow-make", name: "Make Demo" },
    },
  },
  zapier: {
    event_id: "event-zapier-1",
    timestamp: "2026-07-24T08:00:05Z",
    schema_version: "1",
    task: {
      id: "run-zapier-1",
      started_at: "2026-07-24T08:00:00Z",
      completed_at: "2026-07-24T08:00:05Z",
      status: "completed",
      zap: { id: "workflow-zapier", name: "Zapier Demo" },
    },
  },
} as const;

Deno.test("all four provider adapters produce the canonical contract", () => {
  for (const provider of ["custom", "n8n", "make", "zapier"] as const) {
    const event = normalizeProviderEvent(provider, fixtures[provider]);
    assertEquals(event.provider, provider);
    assert(event.external_run_id.length > 0);
    assert(event.external_workflow_id.length > 0);
    assert(event.event_timestamp.endsWith("Z"));
  }
});

Deno.test("sensitive summary keys are removed", () => {
  const event = normalizeProviderEvent("custom", fixtures.custom);
  assertEquals(event.input_summary, { count: 4 });
});

Deno.test("unknown fields are tolerated", () => {
  const event = normalizeProviderEvent("custom", {
    ...fixtures.custom,
    future_provider_field: { nested: true },
  });
  assertEquals(event.run_status, "succeeded");
});

Deno.test("invalid structural types are rejected", () => {
  assertThrows(
    () => normalizeProviderEvent("n8n", { execution: "not-an-object" }),
    Error,
    "execution must be an object",
  );
});

Deno.test("invalid event ordering is rejected", () => {
  assertThrows(
    () =>
      normalizeProviderEvent("custom", {
        ...fixtures.custom,
        started_at: "2026-07-24T08:00:05Z",
        ended_at: "2026-07-24T08:00:00Z",
      }),
    Error,
    "ended_at cannot be earlier",
  );
});
