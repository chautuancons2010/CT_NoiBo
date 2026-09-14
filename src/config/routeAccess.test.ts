import { describe, expect, it } from "vitest";

import { hasAreaAccess } from "@/config/routeAccess";

describe("route area access", () => {
  it("allows an area when one scoped permission matches", () => {
    expect(hasAreaAccess(["attendance.self.view"], "attendance")).toBe(true);
    expect(hasAreaAccess(["warehouse.item.view"], "warehouse")).toBe(true);
  });

  it("denies unrelated direct route access", () => {
    expect(hasAreaAccess(["profile.view"], "warehouse")).toBe(false);
    expect(hasAreaAccess(["dashboard.view"], "settings")).toBe(false);
  });
});
