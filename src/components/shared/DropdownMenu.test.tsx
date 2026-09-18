import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DropdownMenu } from "@/components/shared/DropdownMenu";

describe("DropdownMenu", () => {
  it("closes after clicking outside or pressing Escape", () => {
    render(<DropdownMenu label="Tác vụ"><a href="/test">Chi tiết</a></DropdownMenu>);
    const summary = screen.getByLabelText("Tác vụ");
    const details = summary.closest("details") as HTMLDetailsElement;

    fireEvent.click(summary);
    expect(details.open).toBe(true);
    fireEvent.pointerDown(document.body);
    expect(details.open).toBe(false);

    fireEvent.click(summary);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(details.open).toBe(false);
  });
});
