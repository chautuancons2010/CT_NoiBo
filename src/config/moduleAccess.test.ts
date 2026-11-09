import { describe, expect, it } from "vitest";
import { lockedModule, lockedModuleForRequestPath, moduleForRequestPath } from "@/config/moduleAccess";
import { defaultSystemSettings, isPathEnabled, moduleKeys, moduleSettingsSchema } from "@/config/systemSettings";

describe("module availability", () => {
  it.each([
    ["/employees/123", "human_resources"], ["/attendance/today", "human_resources"],
    ["/timesheets/matrix", "human_resources"], ["/leave/manage", "human_resources"],
    ["/leave/balances", "human_resources"], ["/leave/settlements", "human_resources"],
    ["/personal/payslips", "attendance"], ["/attendance/me", "attendance"],
    ["/project-monitoring/recent", "projects"], ["/worker-attendance", "projects"],
    ["/dashboard/warehouse", "warehouse"], ["/settings/warehouse", "warehouse"],
    ["/accounting/payroll/123", "accounting"], ["/approvals/123", "operations"],
    ["/reports", "reports"], ["/api/v1/attendance/records/123", "human_resources"],
    ["/api/v1/attendance/events", "attendance"], ["/api/v1/leave-requests/123/submit", "attendance"],
    ["/api/v1/attendance/dashboard", "attendance"], ["/api/v1/attendance/adjustment-requests", "attendance"],
    ["/api/v1/project-monitoring/summary", "projects"], ["/api/v1/insurance/contributions", "human_resources"],
    ["/api/v1/items/123", "warehouse"], ["/api/v1/shipments/123/receiving", "import_export"],
    ["/api/v1/accounting/payroll/123/export", "accounting"], ["/api/v1/approvals/123/approve", "operations"],
    ["/api/v1/report-exports/123/download", "reports"],
    ["/api/external/v1/inventory", "warehouse"], ["/api/external/v1/employees", "human_resources"]
  ])("maps the page or API %s to %s", (path, module) => {
    expect(moduleForRequestPath(path)).toBe(module);
    const modules = { ...defaultSystemSettings.modules, [module]: false };
    expect(lockedModule(module as (typeof moduleKeys)[number], modules)).toBe(module);
    if (!path.startsWith("/api/")) expect(isPathEnabled(path, modules)).toBe(false);
  });

  it("keeps administration and recovery accessible when every module is locked", () => {
    const modules = Object.fromEntries(moduleKeys.map((key) => [key, false])) as typeof defaultSystemSettings.modules;
    for (const path of ["/system-admin/modules", "/api/v1/modules", "/api/v1/modules/warehouse", "/api/v1/system-settings/modules", "/api/v1/auth/logout", "/dashboard", "/profile", "/module-locked", "/warehouse-other", "/api/v1/items-other"]) {
      expect(moduleForRequestPath(path)).toBeNull();
      expect(isPathEnabled(path, modules)).toBe(true);
    }
  });

  it("keeps older saved locks when adding accounting and operations settings", () => {
    const legacy = Object.fromEntries(Object.entries(defaultSystemSettings.modules).filter(([key]) => key !== "accounting" && key !== "operations"));
    const upgraded = moduleSettingsSchema.parse({ ...legacy, warehouse: false, human_resources: false });
    expect(upgraded).toMatchObject({ warehouse: false, human_resources: false, accounting: true, operations: true });
  });

  it("locks reports with their parent module while leaving the dashboard available", () => {
    const modules = { ...defaultSystemSettings.modules, operations: false };
    expect(lockedModule("reports", modules)).toBe("operations");
    expect(isPathEnabled("/reports", modules)).toBe(false);
    expect(isPathEnabled("/dashboard", modules)).toBe(true);
  });

  it("blocks routes that depend on a locked module outside their primary application", () => {
    const modules = { ...defaultSystemSettings.modules, accounting: false, warehouse: false };
    expect(isPathEnabled("/personal/payslips/123", modules)).toBe(false);
    expect(lockedModuleForRequestPath("/personal/payslips/123", modules)).toBe("accounting");
    expect(lockedModuleForRequestPath("/api/v1/shipments/123/create-warehouse-receipt", modules)).toBe("warehouse");
    expect(lockedModuleForRequestPath("/api/v1/shipments/123", modules)).toBeNull();
  });
});
