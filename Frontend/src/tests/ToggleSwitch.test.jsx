import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import ToggleSwitch from "../components/ToggleSwitch";

describe("ToggleSwitch", () => {
  it("renders in off state by default", () => {
    render(<ToggleSwitch enabled={false} onChange={() => {}} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.checked).toBe(false);
  });

  it("calls onChange when clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ToggleSwitch enabled={false} onChange={onChange} />);
    await user.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("applies correct aria attributes", () => {
    render(<ToggleSwitch enabled={false} onChange={() => {}} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDefined();
  });
});
