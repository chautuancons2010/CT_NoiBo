import { describe, expect, it } from "vitest";

import {
  appearanceSettingsSchema,
  dashboardSettingsSchema,
  defaultSystemSettings,
  deriveBrandColorTokens,
  isPathEnabled,
  moduleForPath,
  navigationSettingsSchema,
  normalizeStoredNavigationSettings,
  payslipSettingsSchema
} from "@/config/systemSettings";

describe("typed system settings", () => {
  it("rejects unknown settings keys", () => {
    expect(() => appearanceSettingsSchema.parse({ ...defaultSystemSettings.appearance, rawCss: "body{}" })).toThrow();
  });

  it("rejects arbitrary routes and duplicate order entries", () => {
    expect(() => navigationSettingsSchema.parse({
      ...defaultSystemSettings.navigation,
      itemOrder: defaultSystemSettings.navigation.itemOrder.map((path, index) => index === 0 ? "/unknown" : path)
    })).toThrow();
    expect(() => navigationSettingsSchema.parse({
      ...defaultSystemSettings.navigation,
      itemOrder: defaultSystemSettings.navigation.itemOrder.map((path, index) => index === 1 ? "/dashboard" : path)
    })).toThrow();
  });

  it("upgrades a saved navigation layout when new routes are registered", () => {
    const upgraded = navigationSettingsSchema.parse(normalizeStoredNavigationSettings({
      hiddenItems: ["/employees", "/removed"],
      itemOrder: ["/projects", "/dashboard", "/removed"],
      defaultLandingPage: "/projects",
      groupsExpanded: false
    }));

    expect(upgraded.itemOrder.slice(0, 2)).toEqual(["/projects", "/dashboard"]);
    expect(upgraded.itemOrder).toHaveLength(defaultSystemSettings.navigation.itemOrder.length);
    expect(upgraded.hiddenItems).toEqual(["/employees"]);
    expect(upgraded.groupsExpanded).toBe(false);
  });

  it("derives a readable foreground and all safe color tokens", () => {
    const light = deriveBrandColorTokens("#FDE68A");
    const dark = deriveBrandColorTokens("#114F8B");
    expect(light.primaryForeground).toBe("#111827");
    expect(dark.primaryForeground).toBe("#FFFFFF");
    expect(light.contrast).toBeGreaterThanOrEqual(4.5);
    expect(dark.primaryHover).toMatch(/^#[0-9A-F]{6}$/);
    expect(dark.focusRing).toMatch(/^#[0-9A-F]{8}$/);
  });

  it("maps routes to module flags without changing permission state", () => {
    expect(moduleForPath("/warehouse/items/123")).toBe("warehouse");
    expect(isPathEnabled("/warehouse/items", defaultSystemSettings.modules)).toBe(true);
    expect(isPathEnabled("/employees", defaultSystemSettings.modules)).toBe(true);
    expect(isPathEnabled("/system-admin/modules", defaultSystemSettings.modules)).toBe(true);
  });

  it("only accepts registered dashboard presets and widgets", () => {
    expect(dashboardSettingsSchema.parse(defaultSystemSettings.dashboard)).toEqual(defaultSystemSettings.dashboard);
    expect(() => dashboardSettingsSchema.parse({ ...defaultSystemSettings.dashboard, presets: defaultSystemSettings.dashboard.presets.map((preset, index) => index ? preset : { ...preset, enabledWidgets: ["unknown"] }) })).toThrow();
  });

  it("validates the payslip template", () => {
    expect(payslipSettingsSchema.parse(defaultSystemSettings.payslip)).toEqual(defaultSystemSettings.payslip);
    expect(() => payslipSettingsSchema.parse({ ...defaultSystemSettings.payslip, primaryColor: "green" })).toThrow();
  });
});
