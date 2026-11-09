import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkCalendar } from "./WorkCalendar";

describe("WorkCalendar", () => {
  it("keeps blank dates out of navigation and supports arrow keys without selecting a record", () => {
    const select = vi.fn();
    render(<WorkCalendar label="Công tháng 11" weeks={[[null, null, "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"]]} getDay={(date) => ({ label: date })} onSelectDate={select} />);
    const first = screen.getByRole("button", { name: "2026-11-03" });
    expect(first).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(first, { key: "ArrowRight" });
    const next = screen.getByRole("button", { name: "2026-11-04" });
    expect(next).toHaveFocus();
    expect(select).not.toHaveBeenCalled();
    fireEvent.click(next);
    expect(select).toHaveBeenCalledWith("2026-11-04");
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });
});
