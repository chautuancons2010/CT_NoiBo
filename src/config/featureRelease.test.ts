import { describe, expect, it } from "vitest";
import { bypassStoredModuleLock, hasUnrestrictedReleaseAccess, isReleasedFeaturePath, isReleasedApplication, releaseModuleSettings } from "./featureRelease";
import { defaultSystemSettings, moduleKeys } from "./systemSettings";
import { resolveMobileNavigation } from "./mobileNavigationResolver";
describe("attendance release boundary", () => {
  it.each(["hr", "human_resources", "human-resources"])("removes extra release and module locks from %s without granting admin authority", role => {
    expect(hasUnrestrictedReleaseAccess([role])).toBe(false);
    for (const app of ["attendance", "human-resources"]) expect(isReleasedApplication(app, [role])).toBe(true);
    for (const app of ["overview", "projects", "warehouse", "accounting", "import-export", "system", "operations", "messaging"]) expect(isReleasedApplication(app, [role])).toBe(true);
    for (const path of ["/employees/new", "/attendance/today", "/employees/field-attendance/session", "/timesheets/matrix", "/settings/leave", "/personal", "/personal/payslips", "/settings/users"]) {
      expect(isReleasedFeaturePath(path, "GET", [role])).toBe(true);
      expect(bypassStoredModuleLock(path, "GET", [role])).toBe(true);
    }
    for (const path of ["/projects", "/warehouse", "/accounting", "/messages", "/system-admin", "/reports"]) expect(isReleasedFeaturePath(path, "GET", [role])).toBe(true);
    expect(isReleasedFeaturePath("/api/v1/worker-attendance/sessions", "GET", [role])).toBe(true);
    expect(isReleasedFeaturePath("/api/v1/worker-attendance/sessions", "POST", [role])).toBe(true);
    expect(isReleasedFeaturePath("/api/v1/projects", "GET", [role])).toBe(true);
    expect(isReleasedFeaturePath("/api/v1/projects", "POST", [role])).toBe(true);
    const allLocked = Object.fromEntries(moduleKeys.map(key => [key, false])) as typeof defaultSystemSettings.modules;
    expect(Object.values(releaseModuleSettings(allLocked, [role])).every(Boolean)).toBe(true);
  });
  it("keeps every admin module open independently of HR membership and saved module locks", () => {
    const locked = Object.fromEntries(moduleKeys.map(key => [key, false])) as typeof defaultSystemSettings.modules;
    expect(Object.values(releaseModuleSettings(locked, ["hr", "admin"])).every(Boolean)).toBe(true);
    for (const path of ["/system-admin", "/accounting", "/warehouse", "/messages", "/api/v1/projects", "/api/v1/accounting/payroll"]) {
      expect(isReleasedFeaturePath(path, "POST", ["admin"])).toBe(true);
      expect(bypassStoredModuleLock(path, "POST", ["admin"])).toBe(true);
    }
  });
  it("blocks writes and direct pages for unopened business functions", () => {
    for (const path of ["/warehouse", "/accounting/payroll", "/api/v1/payroll-periods", "/api/v1/projects"]) expect(isReleasedFeaturePath(path, "POST")).toBe(false);
    expect(isReleasedFeaturePath("/api/v1/projects", "GET")).toBe(true);
    expect(isReleasedFeaturePath("/employees/new")).toBe(true);
    expect(isReleasedFeaturePath("/settings/users")).toBe(true);
    expect(isReleasedFeaturePath("/api/v1/employees/id/accounts", "POST")).toBe(true);
    expect(isReleasedFeaturePath("/api/v1/work-calendar", "POST")).toBe(true);
    expect(isReleasedFeaturePath("/api/v1/shifts/assignments", "DELETE")).toBe(true);
    expect(isReleasedApplication("accounting")).toBe(false);
  });
  it("keeps role navigation stable across screens and excludes unopened functions", () => {
    const user = {id:"hr",username:"hr",displayName:"HR",email:"hr@example.invalid",status:"active" as const,permissions:["attendance.view_all","timesheet.view","chat.access","employee.view"] as const};
    const actor = {...user, permissions:[...user.permissions]};
    const expected = resolveMobileNavigation("/personal",actor).direct;
    expect(expected.some(item=>item.href==="/attendance/today")).toBe(true);
    expect(expected.some(item=>["/messages","/employees"].includes(item.href))).toBe(false);
    for (const path of ["/projects", "/attendance/today", "/timesheets/matrix"]) expect(resolveMobileNavigation(path,actor).direct).toEqual(expected);
  });
});
