import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProjectMonitoringSummary } from "../types/projectTypes";
import { ProjectMonitoringWorkspace } from "./ProjectMonitoringWorkspace";

const summary: ProjectMonitoringSummary = {
  active: 1, onTrack: 0, atRisk: 1, delayed: 0, paused: 0, averageCompletion: 59,
  projects: [
    { id: "one", code: "CT01", name: "Cảng Trường An", startDate: "2026-01-01", status: "active", health: "at_risk", currentPeople: 8, worksiteCount: 1, rowVersion: 1, projectManagerName: "Kỹ sư A", completionPercent: 20, openHighIssues: 1, stale: true },
    { id: "two", code: "CT02", name: "Công trường mẫu B", startDate: "2026-01-01", status: "completed", health: "completed", currentPeople: 0, worksiteCount: 1, rowVersion: 1, completionPercent: 98, openHighIssues: 0, stale: false }
  ],
  attention: [{ id: "issue-one", projectId: "one", projectName: "Cảng Trường An", sourceUpdateId: "update-one", title: "Thiếu vật tư", severity: "high", status: "open", createdAt: "2026-11-01", updatedAt: "2026-11-02" }], recentUpdates: []
};
describe("project monitoring workbench", () => {
  it("filters by an unaccented name and clears criteria without inventing projects", () => {
    const { container } = render(<ProjectMonitoringWorkspace summary={summary} canOpenProject canViewIssues />);
    expect(screen.getByRole("table", { name: "Dự án đang theo dõi" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm dự án theo dõi" }), { target: { value: "cang truong an" } });
    expect(container.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(screen.queryByText("Công trường mẫu B")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
    fireEvent.change(container.querySelector("select")!, { target: { value: "completed" } });
    expect(container.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(screen.getByRole("progressbar", { name: "Tiến độ Công trường mẫu B" })).toHaveAttribute("value", "98");
  });
  it("keeps project progress and issue links bound to their real record ids", () => {
    render(<ProjectMonitoringWorkspace summary={summary} canOpenProject canViewIssues />);
    expect(screen.getByRole("link", { name: "Mở chi tiết dòng 1" })).toHaveAttribute("href", "/projects/one/progress");
    fireEvent.click(screen.getByRole("button", { name: "Vấn đề cần xử lý (1)" }));
    expect(screen.getByRole("link", { name: "Thiếu vật tư" })).toHaveAttribute("href", "/projects/one/updates/update-one");
  });
  it("retains monitoring data without rendering actions the user cannot open", () => {
    const { container } = render(<ProjectMonitoringWorkspace summary={summary} canOpenProject={false} canViewIssues={false} />);
    expect(screen.getByText("Công trường mẫu B")).toBeInTheDocument();
    expect(container.querySelectorAll('a[href^="/projects/"]')).toHaveLength(0);
    expect(screen.queryByRole("link", { name: /Trung tâm vấn đề/ })).not.toBeInTheDocument();
  });
});
