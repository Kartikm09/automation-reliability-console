import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
  it("runs an enabled command", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Acknowledge</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("prevents interaction while loading", () => {
    render(<Button loading>Rotate credential</Button>);
    expect(
      screen.getByRole("button", { name: "Rotate credential" }),
    ).toBeDisabled();
  });
});
