import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaveRequest } from "@/features/leave/types/leaveTypes";
import { AppError } from "@/lib/api/errors";

const present = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim()) && !["—", "-", "null", "undefined"].includes(value.trim());
const fields = ["employeeName", "employeeCode", "departmentName", "positionName"] as const;
function relationName(value: unknown): string | undefined {
  const relation = Array.isArray(value) ? value[0] : value;
  return relation && typeof relation === "object" && "name" in relation && present(relation.name) ? relation.name : undefined;
}

/** Visibility is checked by the caller before missing historical snapshots are filled. */
export async function hydrateLeaveIdentities(client: SupabaseClient, requests: LeaveRequest[]): Promise<LeaveRequest[]> {
  const ids = [...new Set(requests.filter(request => !present(request.employeeName) || !present(request.employeeCode)).map(request => request.employeeId))];
  if (!ids.length) return requests;
  const identities = new Map<string, Partial<Pick<LeaveRequest, typeof fields[number]>>>();
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100), allowed = new Set(batch);
    const { data, error } = await client.from("employees")
      .select("id,employee_code,full_name,departments!employees_department_id_fkey(name),positions!employees_position_id_fkey(name)")
      .in("id", batch);
    if (error) throw new AppError("SERVER_ERROR", "Không thể đọc nhân viên trong đơn nghỉ.");
    for (const employee of data ?? []) if (allowed.has(String(employee.id))) identities.set(String(employee.id), {
      employeeName: present(employee.full_name) ? employee.full_name : undefined,
      employeeCode: present(employee.employee_code) ? employee.employee_code : undefined,
      departmentName: relationName(employee.departments), positionName: relationName(employee.positions)
    });
  }
  return requests.map(request => {
    const identity = identities.get(request.employeeId);
    if (!identity) return request;
    const filled = { ...request };
    for (const field of fields) if (!present(request[field]) && identity[field]) filled[field] = identity[field]!;
    return filled;
  });
}
