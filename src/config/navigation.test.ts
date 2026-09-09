import { describe, expect, it } from "vitest";

import {
  desktopNavigation,
  filterGroupsByPermissions,
  isNavigationItemActive
} from "@/config/navigation";
import type { Permission } from "@/lib/auth/permissions";

describe("permission-aware navigation", () => {
  it("hides navigation items when permission is missing", () => {
    const permissions: Permission[] = ["dashboard.view", "employee.view"];
    const groups = filterGroupsByPermissions(desktopNavigation, permissions);
    const labels = groups.flatMap((group) => group.items.map((item) => item.label));

    expect(labels).toContain("Tổng quan");
    expect(labels).toContain("Nhân viên");
    expect(labels).not.toContain("Hàng hóa");
    expect(labels).not.toContain("Audit log");
  });

  it("detects active nested routes without local navigation state", () => {
    expect(
      isNavigationItemActive("/employees/NV001/profile", {
        href: "/employees"
      })
    ).toBe(true);
    expect(
      isNavigationItemActive("/attendance", {
        href: "/dashboard",
        exact: true
      })
    ).toBe(false);
  });
});
