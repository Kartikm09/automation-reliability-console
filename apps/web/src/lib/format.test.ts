import { describe, expect, it } from "vitest";

import { formatDuration, titleCase } from "./format";

describe("format helpers", () => {
  it("formats durations without exposing raw milliseconds", () => {
    expect(formatDuration(860)).toBe("860 ms");
    expect(formatDuration(2_500)).toBe("2.5 s");
  });

  it("normalizes machine states for the interface", () => {
    expect(titleCase("timed_out")).toBe("Timed Out");
    expect(titleCase("workflow_run.event_applied")).toBe(
      "Workflow Run Event Applied",
    );
  });
});
