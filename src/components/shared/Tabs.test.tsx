import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ContextTabs } from "@/components/shared/Tabs";

describe("ContextTabs", () => {
  it("announces the active route and keeps one horizontal scroller", () => {
    const { container } = render(
      <ContextTabs
        items={[
          { active: true, href: "/projects/1/progress", label: "Thi công" },
          { href: "/projects/1/team", label: "Chấm công" }
        ]}
        label="Không gian làm việc gói"
      />
    );

    expect(screen.getByRole("navigation", { name: "Không gian làm việc gói" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Thi công" })).toHaveAttribute("aria-current", "page");
    expect(container.querySelectorAll(".context-tabs__scroller")).toHaveLength(1);
  });

  it("supports instant in-workspace selection without route navigation", () => {
    const onSelect = vi.fn();
    render(<ContextTabs items={[{ label: "Hôm nay", onSelect }]} label="Không gian làm việc gói" />);
    fireEvent.click(screen.getByRole("button", { name: "Hôm nay" }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
