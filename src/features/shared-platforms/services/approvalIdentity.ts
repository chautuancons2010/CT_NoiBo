import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/api/errors";
import type { ApprovalCase } from "@/features/shared-platforms/types";

export function hasRequesterName(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim()) && !["—", "-", "null", "undefined"].includes(value.trim());
}

/** Call only after approval visibility checks. All reads are bounded to those cases. */
export async function hydrateApprovalRequesters(client: SupabaseClient, cases: ApprovalCase[]): Promise<ApprovalCase[]> {
  const missing = cases.filter(item => item.domainType === "LEAVE" && !hasRequesterName(item.requesterName));
  if (!missing.length) return cases;
  const requestIds = new Set(missing.map(item => item.domainId));
  const { data: requests, error } = await client.from("leave_requests")
    .select("id,employee_id,employee_snapshot").in("id", [...requestIds]);
  if (error) throw new AppError("SERVER_ERROR", "Không thể đọc người gửi yêu cầu.");
  const scopedRequests = (requests ?? []).filter(request => requestIds.has(String(request.id)));
  const names = new Map<string, string>();
  const employeeIds = new Set<string>();
  for (const request of scopedRequests) {
    const snapshot = request.employee_snapshot as Record<string, unknown> | null;
    if (hasRequesterName(snapshot?.employeeName)) names.set(String(request.id), snapshot.employeeName.trim());
    else if (request.employee_id) employeeIds.add(String(request.employee_id));
  }
  if (employeeIds.size) {
    const { data: employees, error: employeeError } = await client.from("employees").select("id,full_name").in("id", [...employeeIds]);
    if (employeeError) throw new AppError("SERVER_ERROR", "Không thể đọc người gửi yêu cầu.");
    const employeesById = new Map((employees ?? []).filter(employee => employeeIds.has(String(employee.id)) && hasRequesterName(employee.full_name))
      .map(employee => [String(employee.id), String(employee.full_name).trim()]));
    for (const request of scopedRequests) {
      const name = employeesById.get(String(request.employee_id));
      if (!names.has(String(request.id)) && name) names.set(String(request.id), name);
    }
  }
  return cases.map(item => item.domainType === "LEAVE" && !hasRequesterName(item.requesterName) && names.has(item.domainId)
    ? { ...item, requesterName: names.get(item.domainId)! } : item);
}
