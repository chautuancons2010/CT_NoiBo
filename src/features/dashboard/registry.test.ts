import { describe, expect, it } from "vitest";

import { commandRegistry } from "@/features/search/commandRegistry";
import { defaultDashboardSettings, enabledWidgetsFor, resolveDashboardProfile, resolveLandingPage } from "@/features/dashboard/registry";
import type { AuthenticatedUser, Permission } from "@/lib/auth/permissions";

function user(permissions: Permission[]): AuthenticatedUser {
  return { id: "test", displayName: "Test", username: "test", email: "test@example.com", status: "active", permissions };
}

describe("permission-driven dashboard registry", () => {
  it("selects a preset from permissions rather than a role name", () => {
    expect(resolveDashboardProfile(user(["warehouse.view", "dashboard.view"]), defaultDashboardSettings)).toBe("warehouse");
    expect(resolveDashboardProfile(user(["worker_attendance.create", "dashboard.view"]), defaultDashboardSettings)).toBe("supervisor");
  });

  it("does not render enabled widgets when their permission is missing", () => {
    const widgets = enabledWidgetsFor(user(["dashboard.view"]), "employee", defaultDashboardSettings);
    expect(widgets.map((widget) => widget.key)).toEqual(["quick_actions"]);
  });

  it("falls back to an accessible landing page", () => {
    const settings = structuredClone(defaultDashboardSettings);
    settings.presets.find((preset) => preset.profile === "employee")!.landingPage = "/dashboard/management";
    expect(resolveLandingPage(user(["dashboard.view"]), settings)).toBe("/home");
  });

  it("contains no destructive command types", () => {
    expect(new Set(commandRegistry.map((command) => command.type))).toEqual(new Set(["NAVIGATE", "CREATE_ROUTE", "OPEN_SEARCH"]));
    expect(commandRegistry.filter((command) => command.type === "CREATE_ROUTE").some((command) => /delete|xóa|approve|duyệt|reverse|đảo/i.test(command.label))).toBe(false);
  });
});
