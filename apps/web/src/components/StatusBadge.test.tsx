import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge, statusTone } from "./StatusBadge";

describe("StatusBadge", () => {
  it("maps terminal success to the positive tone", () => {
    render(<StatusBadge value="succeeded" />);
    expect(screen.getByText("Succeeded")).toHaveClass("status--positive");
  });

  it("maps operational failures to the negative tone", () => {
    expect(statusTone("failed")).toBe("negative");
    expect(statusTone("timed_out")).toBe("negative");
  });

  it("keeps unknown provider states neutral", () => {
    expect(statusTone("provider_specific_state")).toBe("neutral");
  });
});
