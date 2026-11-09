import { describe, expect, it } from "vitest";

import { normalizeAttention } from "@/features/dashboard/attention";

describe("dashboard attention", () => {
  it("keeps the same total order across mixed work categories and input permutations", () => {
    const old = { id: "old", type: "approval", title: "Vân", ageHours: 240, priority: "HIGH" as const, href: "/approvals/old" };
    const fresh = { id: "new", type: "approval", title: "An", ageHours: 96, priority: "HIGH" as const, href: "/approvals/new" };
    const project = { id: "project", type: "project", title: "Bình", priority: "HIGH" as const, href: "/projects/one" };
    for (const rows of [[old, fresh, project], [project, fresh, old], [fresh, old, project], [old, project, fresh]]) {
      expect(normalizeAttention(rows).map(item => item.id)).toEqual(["old", "new", "project"]);
    }
  });
  it("places the longest-waiting request first within the same urgency", () => {
    const result = normalizeAttention([
      { id: "new", type: "approval", title: "An", ageHours: 96, priority: "HIGH", href: "/approvals/new" },
      { id: "old", type: "approval", title: "Vân", ageHours: 240, priority: "HIGH", href: "/approvals/old" },
      { id: "critical", type: "project", title: "Sự cố", priority: "CRITICAL", href: "/projects/one" }
    ]);
    expect(result.map(item => item.id)).toEqual(["critical", "old", "new"]);
  });
  it("sorts critical items first and combines alerts for one entity", () => {
    const result = normalizeAttention([
      { id: "a", type: "shipment", title: "SHP-001", context: "Thiếu C/O", priority: "MEDIUM", href: "/shipments/1" },
      { id: "b", type: "shipment", title: "SHP-001", context: "Vướng thông quan", priority: "CRITICAL", href: "/shipments/1" },
      { id: "c", type: "project", title: "Dự án A", priority: "HIGH", href: "/projects/1" }
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ href: "/shipments/1", priority: "CRITICAL" });
    expect(result[0].title).toContain("2 vấn đề");
  });
});
