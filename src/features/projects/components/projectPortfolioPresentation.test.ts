import { describe, expect, it } from "vitest";
import type { ProjectSummary } from "../types/projectTypes";
import { filterPortfolio, portfolioStatus, projectIsOverdue } from "./projectPortfolioPresentation";

const project: ProjectSummary = { id: "one", code: "PKG-001", name: "Đường ray cảng", customerName: "Cảng ABC", projectManagerName: "Nguyễn Thị Mỹ", startDate: "2026-10-01", expectedEndDate: "2026-11-03", status: "active", health: "on_track", currentPeople: 15, worksiteCount: 1, rowVersion: 1 };

describe("project portfolio presentation", () => {
  it.each(["duong ray", "NGUYEN my", "pkg-001", "cang abc"])("finds a package by %s", query => {
    expect(filterPortfolio([project], query, "", "2026-11-04")).toEqual([project]);
  });
  it("keeps paused and closed statuses distinct", () => {
    const projects = [project, { ...project, id: "paused", status: "paused" as const }, { ...project, id: "closed", status: "closed" as const }];
    expect(filterPortfolio(projects, "", "active", "2026-11-04").map(item => item.id)).toEqual(["one"]);
    expect(filterPortfolio(projects, "", "paused", "2026-11-04").map(item => item.id)).toEqual(["paused"]);
    expect(portfolioStatus("closed")).toBe("closed");
    expect(portfolioStatus("not-a-status")).toBe("");
  });
  it("flags deadlines only after the business date and clears the flag for terminal records", () => {
    expect(projectIsOverdue(project, "2026-11-03")).toBe(false);
    expect(projectIsOverdue(project, "2026-11-04")).toBe(true);
    expect(projectIsOverdue({ ...project, status: "completed" }, "2026-11-04")).toBe(false);
    expect(projectIsOverdue({ ...project, status: "closed" }, "2026-11-04")).toBe(false);
    expect(projectIsOverdue({ ...project, expectedEndDate: undefined }, "2026-11-04")).toBe(false);
  });
  it("shows running and overdue work before upcoming and completed records without changing input order", () => {
    const projects = [{ ...project, id: "done", status: "completed" as const }, { ...project, id: "future", status: "preparing" as const }, { ...project, id: "later", expectedEndDate: "2026-12-01" }, project];
    expect(filterPortfolio(projects, "", "", "2026-11-04").map(item => item.id)).toEqual(["one", "later", "future", "done"]);
    expect(projects[0].id).toBe("done");
  });
});
