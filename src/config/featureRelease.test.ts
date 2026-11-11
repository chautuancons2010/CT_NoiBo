import { describe, expect, it } from "vitest";
import { isReleasedFeaturePath, isReleasedApplication } from "./featureRelease";
import { resolveMobileNavigation } from "./mobileNavigationResolver";
describe("attendance release boundary", () => {
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
