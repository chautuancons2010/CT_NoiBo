import { describe, expect, it } from "vitest";
import { approvalDashboardItem } from "./approvalPresentation";
import type { ApprovalCase } from "@/features/shared-platforms/types";

const item: ApprovalCase = { id: "one", domainType: "LEAVE", domainId: "leave-one", referenceNumber: "NP-001", requesterName: "Trần An", summary: "1.00 ngày · Nghỉ phép năm", domainLink: "/leave/one", workflowVersion: 1, status: "pending", submittedAt: "2026-11-01T00:00:00Z", waitingHours: 96, metadata: { days: "1.00", leaveType: "Nghỉ phép năm", startDate: "2026-11-10", endDate: "2026-11-10" }, steps: [] };
describe("actionable approval identity", () => {
  it("shows the real requester, reference, duration and period", () => {
    expect(approvalDashboardItem(item, "4 ngày")).toMatchObject({ title: "Trần An", reference: "NP-001", context: "Nghỉ phép năm · 1 ngày · 10/11/2026", priority: "HIGH", dueOrAge: "Chờ 4 ngày", ageHours: 96, href: "/approvals/one" });
  });
  it("uses the stored reference when no requester exists and retains a half day", () => {
    const result = approvalDashboardItem({ ...item, requesterName: "—", metadata: { ...item.metadata, days: 0.5 } }, "4 ngày");
    expect(result.title).toBe("NP-001");expect(result.reference).toBeUndefined();expect(result.context).toContain("0,5 ngày");
  });
});
