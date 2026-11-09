import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaveRequest } from "@/features/leave/types/leaveTypes";
import { hydrateLeaveIdentities } from "./leaveIdentity";

const row = { id: "leave-a", employeeId: "employee-a", employeeName: "—", employeeCode: "—", departmentName: "—", positionName: "—" } as LeaveRequest;
function database() {
  const inIds = vi.fn().mockResolvedValue({ data: [{ id: "employee-a", employee_code: "NV01", full_name: "Trần An", departments: { name: "Kỹ thuật" }, positions: [{ name: "Kỹ sư" }] }, { id: "unrelated", full_name: "Không có quyền" }], error: null });
  const from = vi.fn(() => ({ select: vi.fn(() => ({ in: inIds })) }));
  return { client: { from } as unknown as SupabaseClient, inIds, from };
}
describe("scoped leave identity fallback", () => {
  it("fills missing identities only for employee ids in the authorized requests", async () => {
    const db = database();const [result] = await hydrateLeaveIdentities(db.client, [row]);
    expect(db.inIds).toHaveBeenCalledWith("id", ["employee-a"]);
    expect(result).toMatchObject({ employeeName: "Trần An", employeeCode: "NV01", departmentName: "Kỹ thuật", positionName: "Kỹ sư" });
    expect(row.employeeName).toBe("—");
  });
  it("preserves existing historical names when another snapshot field is missing", async () => {
    const db = database();const [result] = await hydrateLeaveIdentities(db.client, [{ ...row, employeeName: "Tên tại ngày gửi" }]);
    expect(result.employeeName).toBe("Tên tại ngày gửi");expect(result.employeeCode).toBe("NV01");
  });
  it("does not query complete snapshots or an empty authorized result", async () => {
    const db = database();await hydrateLeaveIdentities(db.client, []);
    const records = [{ ...row, employeeName: "An", employeeCode: "NV01", departmentName: "Kỹ thuật", positionName: "Kỹ sư" }];
    expect(await hydrateLeaveIdentities(db.client, records)).toBe(records);expect(db.from).not.toHaveBeenCalled();
  });
});
