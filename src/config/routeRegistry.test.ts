import { describe, expect, it } from "vitest";

import { employeeDetailSections, getBackHref, getBreadcrumbs, getRouteMeta, projectDetailSections } from "@/config/routeRegistry";

describe("route registry", () => {
  it("returns metadata for exact routes", () => {
    expect(getRouteMeta("/warehouse/items")).toMatchObject({
      title: "Hàng hóa",
      module: "Kho"
    });
  });

  it("builds breadcrumbs for employee route-backed tabs", () => {
    expect(getBreadcrumbs("/employees/NV001/contracts")).toEqual([
      { label: "Nhân sự", href: "/employees" },
      { label: "NV001", href: "/employees/NV001/profile" },
      { label: "Hợp đồng" }
    ]);
  });

  it("keeps attendance and project history as route-backed employee tabs", () => {
    expect(employeeDetailSections).toEqual(expect.arrayContaining([
      { value: "attendance", label: "Chấm công" },
      { value: "history", label: "Lịch sử" }
    ]));
  });

  it("uses the four package workspaces in business order", () => {
    expect(projectDetailSections).toEqual([
      { value: "progress", label: "Thi công" },
      { value: "team", label: "Chấm công" },
      { value: "profile", label: "Hồ sơ" },
      { value: "documents", label: "Tài liệu" }
    ]);
    expect(getBreadcrumbs("/projects/package-1/documents")).toEqual([
      { label: "Gói / Công trường", href: "/projects" },
      { label: "package-1", href: "/projects/package-1/progress" },
      { label: "Tài liệu" }
    ]);
  });

  it("hides a breadcrumb that only repeats the current page", () => {
    expect(getBreadcrumbs("/dashboard")).toEqual([]);
  });

  it("keeps warehouse edit routes in the warehouse context", () => {
    expect(getRouteMeta("/warehouse/items/57a/edit")).toMatchObject({
      title: "Chỉnh sửa hàng hóa",
      module: "Kho"
    });
  });

  it("resolves a stable return route for every navigation depth", () => {
    expect(getBackHref("/employees/NV001/contracts")).toBe("/employees/NV001/profile");
    expect(getBackHref("/warehouse/items/57/edit")).toBe("/warehouse/items/57");
    expect(getBackHref("/timesheets/periods/period-1/employees/employee-1")).toBe("/timesheets/periods/period-1");
    expect(getBackHref("/employees")).toBe("/dashboard");
    expect(getBackHref("/attendance/me")).toBe("/dashboard");
    expect(getBackHref("/attendance/history")).toBe("/dashboard");
    expect(getBackHref("/attendance/today")).toBe("/dashboard");
    expect(getBackHref("/warehouse/inventory")).toBe("/dashboard");
    expect(getBackHref("/dashboard")).toBeNull();
  });
});
