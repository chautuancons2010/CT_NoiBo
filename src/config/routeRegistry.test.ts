import { describe, expect, it } from "vitest";

import { getBackHref, getBreadcrumbs, getRouteMeta } from "@/config/routeRegistry";

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
    expect(getBackHref("/employees")).toBe("/dashboard");
    expect(getBackHref("/dashboard")).toBeNull();
  });
});
