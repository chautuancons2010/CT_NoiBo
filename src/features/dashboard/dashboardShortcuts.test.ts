import { describe, expect, it } from "vitest";
import { dashboardShortcutsFor } from "./dashboardShortcuts";
import { defaultSystemSettings } from "@/config/systemSettings";
import type { AuthenticatedUser, Permission } from "@/lib/auth/permissions";
import { defaultDashboardSettings, resolveDashboardProfile, resolveMobileLandingPage } from "./registry";

const user = (permissions: Permission[]): AuthenticatedUser => ({ id: "test", username: "test", displayName: "Test", email: "test@example.com", status: "active", permissions });
const modules = defaultSystemSettings.modules;

describe("role dashboard shortcuts", () => {
  it("puts attendance photo review first for HR and includes their permitted work", () => {
    const shortcuts = dashboardShortcutsFor(user(["attendance.view_all", "timesheet.view_all", "leave.view_all", "employee.view"]), "hr", modules);
    expect(shortcuts.map((item) => item.href)).toEqual(["/attendance/today", "/timesheets/matrix", "/leave/manage", "/employees"]);
    expect(shortcuts[0].label).toBe("Kiểm tra ảnh chấm công");
  });
  it.each([
    ["warehouse", ["warehouse.view", "warehouse.receipt.view"], "/warehouse/inventory"],
    ["accounting", ["payroll.view", "salary.view"], "/accounting/payroll"],
    ["import_export", ["shipment.view", "shipment.create"], "/import-export/shipments"],
    ["supervisor", ["worker_attendance.create", "project.view"], "/worker-attendance/today"],
    ["management", ["project_monitoring.view_all", "report.view"], "/project-monitoring"],
    ["employee", ["attendance.self", "leave.self.create"], "/attendance/me"]
  ] as const)("prioritizes %s tasks using effective permissions", (profile, permissions, firstHref) => {
    const shortcuts = dashboardShortcutsFor(user([...permissions]), profile, modules);
    expect(shortcuts[0].href).toBe(firstHref);
    expect(shortcuts.some((item) => item.key === "attendance.photos")).toBe(false);
  });
  it("never grants shortcuts just because the selected profile is HR", () => {
    expect(dashboardShortcutsFor(user(["dashboard.view"]), "hr", modules)).toEqual([]);
  });
  it("removes shortcuts to locked modules including personal payslips", () => {
    expect(dashboardShortcutsFor(user(["employee.view", "attendance.view_all"]), "hr", { ...modules, human_resources: false })).toEqual([]);
    expect(dashboardShortcutsFor(user(["payslip.self.view"]), "employee", { ...modules, accounting: false })).toEqual(expect.arrayContaining([expect.objectContaining({href:"/personal/payslips"})]));
  });
  it("resolves reviewers and team managers to their workspaces without changing supervisor precedence", () => {
    expect(resolveDashboardProfile(user(["attendance.view_all", "dashboard.view"]), defaultDashboardSettings)).toBe("hr");
    expect(resolveDashboardProfile(user(["project_monitoring.view", "dashboard.view"]), defaultDashboardSettings)).toBe("management");
    expect(resolveDashboardProfile(user(["project_monitoring.view", "worker_attendance.create", "dashboard.view"]), defaultDashboardSettings)).toBe("supervisor");
  });
  it("restores personal mobile home for every role", () => {
    expect(resolveMobileLandingPage(user(["dashboard.view", "employee.view"]), defaultDashboardSettings)).toBe("/personal");
    expect(resolveMobileLandingPage(user(["dashboard.view", "warehouse.view"]), defaultDashboardSettings)).toBe("/personal");
    expect(resolveMobileLandingPage(user(["dashboard.view", "attendance.self"]), defaultDashboardSettings)).toBe("/personal");
  });
});
