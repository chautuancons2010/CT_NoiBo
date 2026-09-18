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

    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Nhân viên");
    expect(labels).not.toContain("Thông quan");
    expect(labels).not.toContain("Hàng hóa");
    expect(labels).not.toContain("Audit log");
  });

  it("shows organization management with its dedicated permissions", () => {
    const groups = filterGroupsByPermissions(desktopNavigation, ["department.manage", "position.manage"]);
    const labels = groups.flatMap((group) => group.items.map((item) => item.label));
    expect(labels).toContain("Phòng ban");
    expect(labels).toContain("Chức vụ");
    expect(labels).not.toContain("Hồ sơ nhân viên");
  });

  it("shows the salary log only to users allowed to view salary history", () => {
    const withoutHistory = filterGroupsByPermissions(desktopNavigation, ["salary.view"]);
    const withHistory = filterGroupsByPermissions(desktopNavigation, ["salary.history.view"]);
    expect(withoutHistory.flatMap((group) => group.items.map((item) => item.href))).not.toContain("/accounting/salary-history");
    expect(withHistory.flatMap((group) => group.items.map((item) => item.href))).toContain("/accounting/salary-history");
  });

  it("shows attendance period management with its dedicated permission", () => {
    const groups = filterGroupsByPermissions(desktopNavigation, ["attendance.period.manage"]);
    const paths = groups.flatMap((group) => group.items.map((item) => item.href));
    expect(paths).toContain("/timesheets");
    expect(paths).toContain("/timesheets/matrix");
    expect(paths).not.toContain("/attendance/me");
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
    expect(
      isNavigationItemActive("/projects/updates", {
        href: "/projects",
        exact: true
      })
    ).toBe(false);
    expect(
      isNavigationItemActive("/projects/updates", {
        href: "/projects/updates"
      })
    ).toBe(true);
  });
});
