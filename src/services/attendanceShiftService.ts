import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/api/errors";
import type { AttendancePolicy } from "@/features/attendance/types/attendanceTypes";

type ShiftRow = Record<string, unknown>;
export async function readSharedShiftCatalog(client: SupabaseClient, date: string) {
  const results = await Promise.all([
    client.from("shifts").select("*").eq("active", true),
    client.from("shift_assignments").select("*").eq("active", true).lte("effective_from", date).or(`effective_to.is.null,effective_to.gte.${date}`),
    client.from("shift_versions").select("*").lte("effective_from", date).order("effective_from", { ascending: false })
  ]);
  if (results.some(result => result.error)) throw new AppError("SERVER_ERROR", "Không thể đồng bộ ca làm từ Nhân sự.");
  const shifts = results[0].data ?? [], assignments = results[1].data ?? [], versions = results[2].data ?? [];
  return (input: { employeeId: string; departmentId?: string; projectIds: string[]; fallbackCode?: string }) => {
    const rank: Record<string, number> = { employee: 4, project: 3, department: 2, company: 1 };
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const assignment = assignments.filter(row => Array.isArray(row.weekdays) && row.weekdays.includes(weekday) && (
      row.scope_type === "company" || row.scope_type === "employee" && row.scope_id === input.employeeId ||
      row.scope_type === "department" && row.scope_id === input.departmentId || row.scope_type === "project" && input.projectIds.includes(row.scope_id)
    )).sort((a,b) => (rank[b.scope_type] ?? 0) - (rank[a.scope_type] ?? 0) || String(b.effective_from).localeCompare(String(a.effective_from)) || String(a.id).localeCompare(String(b.id)))[0];
    const shift = shifts.find(row => row.id === assignment?.shift_id) ?? shifts.find(row => row.code === input.fallbackCode);
    if (!shift) return undefined;
    const version = versions.find(row => row.shift_id === shift.id && (!row.effective_to || row.effective_to >= date));
    return { ...shift, ...version, id: shift.id } as ShiftRow;
  };
}

export async function applyEmployeeShift(client: SupabaseClient, employeeId: string, date: string, policy: AttendancePolicy): Promise<AttendancePolicy> {
  const [resolve, employee, projects] = await Promise.all([
    readSharedShiftCatalog(client, date),
    client.from("employees").select("department_id,employment_types(worker_category)").eq("id", employeeId).single(),
    client.from("project_assignments").select("project_id").eq("employee_id", employeeId).eq("status", "active").lte("start_date", date).or(`end_date.is.null,end_date.gte.${date}`)
  ]);
  if (employee.error || projects.error) throw new AppError("SERVER_ERROR", "Không thể đọc phân ca của nhân viên.");
  const shift = resolve({ employeeId, departmentId: employee.data?.department_id, projectIds: (projects.data ?? []).map(row => String(row.project_id)) });
  const type = employee.data?.employment_types;
  const office = (Array.isArray(type) ? type[0] : type)?.worker_category === "office";
  const base = office ? { ...policy, attendanceEnabled: false, disabledReason: "Văn phòng tạm ngừng chấm công." } : policy;
  return shift ? { ...base, shiftName: String(shift.name), shiftStart: String(shift.start_time).slice(0,5), shiftEnd: String(shift.end_time).slice(0,5), lateThresholdMinutes: Number(shift.late_grace_minutes ?? policy.lateThresholdMinutes) } : base;
}
