import { describe, expect, it } from "vitest";

import { applicationForPath, contextualNavigationGroups, visibleApplications } from "@/config/moduleRegistry";
import { defaultSystemSettings } from "@/config/systemSettings";
import type { AuthenticatedUser, Permission } from "@/lib/auth/permissions";

function user(permissions: Permission[]): AuthenticatedUser {
  return { id: "test", displayName: "Test", username: "test", email: "test@example.com", status: "active", permissions };
}

describe("application registry", () => {
  it("resolves nested routes to one application", () => {
    expect(applicationForPath("/warehouse/receipts/new").id).toBe("warehouse");
    expect(applicationForPath("/projects/abc/updates").id).toBe("projects");
  });

  it("shows launcher applications by permission", () => {
    const applications = visibleApplications(user(["warehouse.view", "profile.view"]), defaultSystemSettings.modules);
    expect(applications.map((item) => item.id)).toEqual(["warehouse"]);
  });

  it("keeps the sidebar contextual", () => {
    const groups = contextualNavigationGroups("/warehouse/inventory", user(["warehouse.view", "employee.view"]), defaultSystemSettings.modules, defaultSystemSettings.navigation);
    expect(groups).toHaveLength(1);
    expect(groups[0].items.every((item) => item.href.startsWith("/warehouse"))).toBe(true);
  });
});
