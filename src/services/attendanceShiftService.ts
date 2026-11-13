import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/api/errors";
import type { AttendancePolicy } from "@/features/attendance/types/attendanceTypes";
import { readScheduleRules } from "@/features/timesheets/services/portSchedules";
import { arrivalLeadMinutesForDate } from "@/features/timesheets/services/workforceAttendancePolicy";

type ShiftRow = Record<string, unknown>;
export async function readSharedShiftCatalog(client: SupabaseClient, date: string, from = date) {
  const results = await Promise.all([
    client.from("shifts").select("*").eq("active", true),
    client.from("shift_assignments").select("*").eq("active", true).lte("effective_from", date).or(`effective_to.is.null,effective_to.gte.${from}`),
    client.from("shift_versions").select("*").lte("effective_from", date).order("effective_from", { ascending: false }),
    client.from("work_calendar_days").select("*").eq("active", true).gte("calendar_date", from).lte("calendar_date", date)
  ]);
  if (results.some(result => result.error)) throw new AppError("SERVER_ERROR", "Không thể đồng bộ ca làm từ Nhân sự.");
  const shifts = results[0].data ?? [], assignments = results[1].data ?? [], versions = results[2].data ?? [], calendar = results[3].data ?? [];
  return (input: { employeeId: string; departmentId?: string; projectIds: string[]; fallbackCode?: string; selectedPortCode?: string; date?: string }) => {
    const workDate = input.date ?? date;
    const rank: Record<string, number> = { employee: 4, project: 3, department: 2, company: 1 };
    const weekday = new Date(`${workDate}T12:00:00Z`).getUTCDay();
    const inScope = (row: ShiftRow) => (
      row.scope_type === "company" || row.scope_type === "employee" && row.scope_id === input.employeeId ||
      row.scope_type === "department" && row.scope_id === input.departmentId || row.scope_type === "project" && input.projectIds.includes(String(row.scope_id))
    );
    const ordered = assignments.filter(row => inScope(row) && row.effective_from <= workDate && (!row.effective_to || row.effective_to >= workDate)).sort((a,b) => (rank[b.scope_type] ?? 0) - (rank[a.scope_type] ?? 0) || String(b.effective_from).localeCompare(String(a.effective_from)) || String(a.id).localeCompare(String(b.id)));
    const assignment = ordered.find(row => Array.isArray(row.weekdays) && row.weekdays.includes(weekday));
    const offDayAssignment = assignment ? undefined : ordered[0];
    const day = calendar.filter(row => row.calendar_date === workDate && inScope(row)).sort((a,b) => (rank[b.scope_type] ?? 0) - (rank[a.scope_type] ?? 0) || String(a.id).localeCompare(String(b.id)))[0];
    const shift = input.selectedPortCode
      ? shifts.find(row => row.code === input.selectedPortCode && ["PORT_SPECIALIZED", "PORT_GENERAL"].includes(String(row.code)))
      : shifts.find(row => row.id === (assignment ?? offDayAssignment)?.shift_id) ?? shifts.find(row => row.code === input.fallbackCode);
    if (!shift) return undefined;
    const version = versions.find(row => row.shift_id === shift.id && row.effective_from <= workDate && (!row.effective_to || row.effective_to >= workDate));
    const merged = { ...shift, ...version };
    const rules = readScheduleRules(merged.schedule_rules);
    return { ...merged, ...(rules ? {schedule_rules:{...rules,arrivalLeadMinutes:arrivalLeadMinutesForDate(workDate,rules.arrivalLeadMinutes)}} : {}), id: shift.id, is_working_day: day ? day.is_working_day === true : input.selectedPortCode ? weekday !== 0 : assignment ? true : offDayAssignment ? false : weekday !== 0, calendar_day_type: day?.day_type } as ShiftRow;
  };
}

export async function applyEmployeeShift(client: SupabaseClient, employeeId: string, date: string, policy: AttendancePolicy): Promise<AttendancePolicy> {
  const [resolve, employee, projects] = await Promise.all([
    readSharedShiftCatalog(client, date),
    client.from("employees").select("department_id,employment_types(worker_category)").eq("id", employeeId).single(),
    client.from("project_assignments").select("project_id").eq("employee_id", employeeId).eq("status", "active").lte("start_date", date).or(`end_date.is.null,end_date.gte.${date}`)
  ]);
  if (employee.error || projects.error) throw new AppError("SERVER_ERROR", "Không thể đọc phân ca của nhân viên.");
  const shift = resolve({ employeeId, departmentId: employee.data?.department_id, projectIds: (projects.data ?? []).map(row => String(row.project_id)), fallbackCode: "DAY" });
  const type = employee.data?.employment_types;
  const office = (Array.isArray(type) ? type[0] : type)?.worker_category === "office";
  const base = office ? { ...policy, attendanceEnabled: false, disabledReason: "Văn phòng tạm ngừng chấm công." } : policy;
  const rules = readScheduleRules(shift?.schedule_rules);
  return shift ? { ...base, shiftName: String(shift.name), shiftStart: String(shift.start_time).slice(0,5), shiftEnd: String(shift.end_time).slice(0,5), lateThresholdMinutes: Number(shift.late_grace_minutes ?? policy.lateThresholdMinutes), arrivalLeadMinutes: arrivalLeadMinutesForDate(date,rules?.arrivalLeadMinutes), breakStartTime: rules?.breakStartTime, breakEndTime: rules?.breakEndTime, isWorkingDay: shift.is_working_day !== false } : {...base,arrivalLeadMinutes:arrivalLeadMinutesForDate(date,base.arrivalLeadMinutes)};
}
