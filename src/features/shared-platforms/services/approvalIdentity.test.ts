import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApprovalCase } from "@/features/shared-platforms/types";
import { hydrateApprovalRequesters } from "./approvalIdentity";

const item = { id: "case-a", domainType: "LEAVE", domainId: "leave-a", requesterName: "—" } as ApprovalCase;
function database(requests: object[], employees: object[] = [], failure = false) {
  const requestIds = vi.fn().mockResolvedValue({ data: requests, error: failure ? { message: "failed" } : null });
  const employeeIds = vi.fn().mockResolvedValue({ data: employees, error: null });
  const from = vi.fn((table: string) => ({ select: vi.fn(() => ({ in: table === "leave_requests" ? requestIds : employeeIds })) }));
  return { client: { from } as unknown as SupabaseClient, from, requestIds, employeeIds };
}
describe("authorized approval identity fallback", () => {
  it("reads only authorized request ids and related employee identities", async () => {
    const db = database([{ id: "leave-a", employee_id: "employee-a", employee_snapshot: {} }, { id: "unrelated", employee_id: "secret" }], [{ id: "employee-a", full_name: "Trần An" }, { id: "secret", full_name: "Không được đọc" }]);
    const result = await hydrateApprovalRequesters(db.client, [item]);
    expect(db.requestIds).toHaveBeenCalledWith("id", ["leave-a"]);
    expect(db.employeeIds).toHaveBeenCalledWith("id", ["employee-a"]);
    expect(result[0].requesterName).toBe("Trần An");expect(item.requesterName).toBe("—");
  });
  it("preserves original names and prefers an existing source snapshot", async () => {
    const db = database([{ id: "leave-a", employee_id: "employee-a", employee_snapshot: { employeeName: "Tên tại ngày gửi" } }]);
    const result = await hydrateApprovalRequesters(db.client, [item, { ...item, id: "case-b", requesterName: "Tên hợp lệ" }]);
    expect(result.map(row => row.requesterName)).toEqual(["Tên tại ngày gửi", "Tên hợp lệ"]);
    expect(db.employeeIds).not.toHaveBeenCalled();
  });
  it("does not expand reads to other domains or cases with a valid name", async () => {
    const db = database([]);const rows = [{ ...item, domainType: "WAREHOUSE" }, { ...item, requesterName: "Tên thật" }];
    expect(await hydrateApprovalRequesters(db.client, rows)).toBe(rows);expect(db.from).not.toHaveBeenCalled();
  });
  it("reports read failures rather than manufacturing a requester", async () => {
    const db = database([], [], true);await expect(hydrateApprovalRequesters(db.client, [item])).rejects.toThrow("Không thể đọc người gửi yêu cầu.");
  });
});
