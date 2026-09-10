import { describe, expect, it } from "vitest";

import { getBreadcrumbs, getRouteMeta } from "@/config/routeRegistry";

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
});
