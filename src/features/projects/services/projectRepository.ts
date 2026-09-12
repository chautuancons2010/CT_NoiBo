import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import { AppError } from "@/lib/api/errors";
import { can, type AuthenticatedUser } from "@/lib/auth/permissions";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { assignmentInputSchema, projectInputSchema, worksiteInputSchema } from "@/features/projects/schemas/projectSchemas";
import type { DailySchedule, ProjectAssignment, ProjectDetail, ProjectSummary, Worksite } from "@/features/projects/types/projectTypes";
import { recordAuditLog } from "@/services/audit/auditLog";
import { getApprovedLeaveForEmployeesDate } from "@/features/leave/services/leaveRepository";

type Row = Record<string, unknown>;

function db(): SupabaseClient {
  const client = getSupabaseServiceClient();
  if (!client) throw new AppError("SERVER_ERROR", "Supabase chưa được cấu hình.");
  return client;
}

function required(row: Row, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || !value) throw new AppError("SERVER_ERROR", "Dữ liệu thiếu " + key + ".");
  return value;
}

function optional(row: Row, key: string): string | undefined {
  const value = row[key];
  return typeof value === "string" && value ? value : undefined;
}

function nested(row: Row, key: string): Row | undefined {
  const value = row[key];
  if (Array.isArray(value)) return value[0] as Row | undefined;
  return value && typeof value === "object" ? value as Row : undefined;
}

function mapWorksite(row: Row): Worksite {
  return {
    id: required(row, "id"), projectId: required(row, "project_id"), name: required(row, "name"),
    address: optional(row, "address"), radiusMeters: Number(row.radius_meters), gpsRequired: Boolean(row.gps_required),
    allowedAccuracyThresholdMeters: Number(row.allowed_accuracy_threshold_meters),
    status: required(row, "status") as Worksite["status"], activeFrom: optional(row, "active_from"), activeTo: optional(row, "active_to")
  };
}

function mapAssignment(row: Row): ProjectAssignment {
  const employee = nested(row, "employees");
  const worksite = nested(row, "worksites");
  return {
    id: required(row, "id"), projectId: required(row, "project_id"), worksiteId: optional(row, "worksite_id"),
    worksiteName: worksite ? optional(worksite, "name") : undefined, employeeId: required(row, "employee_id"),
    employeeCode: employee ? required(employee, "employee_code") : "—", employeeName: employee ? required(employee, "full_name") : "—",
    assignmentRole: required(row, "assignment_role") as ProjectAssignment["assignmentRole"], startDate: required(row, "start_date"),
    endDate: optional(row, "end_date"), shiftCode: required(row, "shift_code"), shiftName: required(row, "shift_name"),
    shiftStart: required(row, "shift_start").slice(0, 5), shiftEnd: required(row, "shift_end").slice(0, 5),
    status: required(row, "status") as ProjectAssignment["status"], rowVersion: Number(row.row_version)
  };
}

const projectSelect = "*,manager:employees!projects_project_manager_employee_id_fkey(full_name)";
const assignmentSelect = "*,employees!project_assignments_employee_id_fkey(employee_code,full_name,employment_status),worksites(name)";

async function actorAccountId(client: SupabaseClient, user: AuthenticatedUser): Promise<string | undefined> {
  let query = client.from("app_accounts").select("id").limit(1);
  query = /^[0-9a-f-]{36}$/i.test(user.id) ? query.eq("id", user.id) : query.eq("primary_email", user.email);
  const { data } = await query.maybeSingle();
  return data?.id ? String(data.id) : undefined;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const client = db();
  const [{ data, error }, { data: worksites }, { data: assignments }] = await Promise.all([
    client.from("projects").select(projectSelect).order("updated_at", { ascending: false }),
    client.from("worksites").select("project_id,id"),
    client.from("project_assignments").select("project_id,employee_id").eq("status", "active")
  ]);
  if (error) throw new AppError("SERVER_ERROR", "Không thể đọc danh sách dự án.");
  return (data ?? []).map((item) => {
    const row = item as Row;
    const manager = nested(row, "manager");
    return {
      id: required(row, "id"), code: required(row, "code"), name: required(row, "name"), customerName: optional(row, "customer_name"), summary: optional(row, "summary"),
      startDate: required(row, "start_date"), expectedEndDate: optional(row, "expected_end_date"), actualEndDate: optional(row, "actual_end_date"),
      status: required(row, "status") as ProjectSummary["status"], health: (optional(row, "health") ?? "on_track") as ProjectSummary["health"], projectManagerEmployeeId: optional(row, "project_manager_employee_id"),
      projectManagerName: manager ? optional(manager, "full_name") : undefined,
      currentPeople: new Set((assignments ?? []).filter((assignment) => assignment.project_id === row.id).map((assignment) => assignment.employee_id)).size,
      worksiteCount: (worksites ?? []).filter((worksite) => worksite.project_id === row.id).length,
      rowVersion: Number(row.row_version)
    };
  });
}

export async function getProject(projectId: string): Promise<ProjectDetail> {
  const client = db();
  const [{ data, error }, { data: sites, error: siteError }, { data: assignments, error: assignmentError }] = await Promise.all([
    client.from("projects").select(projectSelect).eq("id", projectId).maybeSingle(),
    client.from("worksites").select("*").eq("project_id", projectId).order("name"),
    client.from("project_assignments").select(assignmentSelect).eq("project_id", projectId).order("assignment_role")
  ]);
  if (error || !data) throw new AppError("NOT_FOUND", "Không tìm thấy dự án.");
  if (siteError || assignmentError) throw new AppError("SERVER_ERROR", "Không thể đọc dữ liệu dự án.");
  const summary = (await listProjects()).find((project) => project.id === projectId)!;
  return { ...summary, note: optional(data as Row, "note"), worksites: (sites ?? []).map((row) => mapWorksite(row as Row)), assignments: (assignments ?? []).map((row) => mapAssignment(row as Row)) };
}

export async function createProject(user: AuthenticatedUser, input: z.infer<typeof projectInputSchema>): Promise<ProjectDetail> {
  if (!can(user.permissions, "project.create")) throw new AppError("PERMISSION_DENIED");
  const client = db();
  const accountId = await actorAccountId(client, user);
  const { data, error } = await client.from("projects").insert({
    code: input.code, name: input.name, customer_name: input.customerName || null, summary: input.summary || null,
    start_date: input.startDate, expected_end_date: input.expectedEndDate || null, status: input.status,
    project_manager_employee_id: input.projectManagerEmployeeId || null, note: input.note || null, created_by: accountId
  }).select("id").single();
  if (error) {
    if (error.code === "23505") throw new AppError("CONFLICT", "Mã dự án đã tồn tại.");
    throw new AppError("SERVER_ERROR", "Không thể tạo dự án.");
  }
  await recordAuditLog({ actorId: accountId ?? user.id, action: "project.created", entityType: "project", entityId: data.id, after: { code: input.code, status: input.status } });
  return getProject(data.id);
}

export async function createWorksite(user: AuthenticatedUser, projectId: string, input: z.infer<typeof worksiteInputSchema>): Promise<Worksite> {
  if (!can(user.permissions, "worksite.manage")) throw new AppError("PERMISSION_DENIED");
  const client = db();
  const project = await getProject(projectId);
  if (project.status === "closed") throw new AppError("CONFLICT", "Dự án đã đóng, không thể thêm công trường.");
  const accountId = await actorAccountId(client, user);
  const { data, error } = await client.from("worksites").insert({
    project_id: projectId, name: input.name, address: input.address || null, latitude: input.latitude ?? null, longitude: input.longitude ?? null,
    radius_meters: input.radiusMeters, gps_required: input.gpsRequired, allowed_accuracy_threshold_meters: input.allowedAccuracyThresholdMeters,
    active_from: input.activeFrom || null, active_to: input.activeTo || null, created_by: accountId
  }).select("*").single();
  if (error || !data) throw new AppError(error?.code === "23505" ? "CONFLICT" : "SERVER_ERROR", error?.code === "23505" ? "Địa điểm này đã tồn tại trong dự án." : "Không thể tạo công trường.");
  await recordAuditLog({ actorId: accountId ?? user.id, action: "worksite.created", entityType: "worksite", entityId: data.id, metadata: { projectId } });
  return mapWorksite(data as Row);
}

function rangesOverlap(firstStart: string, firstEnd: string | undefined, secondStart: string, secondEnd: string | undefined) {
  return firstStart <= (secondEnd ?? "9999-12-31") && secondStart <= (firstEnd ?? "9999-12-31");
}

function timesOverlap(firstStart: string, firstEnd: string, secondStart: string, secondEnd: string) {
  return firstStart < secondEnd && secondStart < firstEnd;
}

export async function createAssignment(user: AuthenticatedUser, projectId: string, input: z.infer<typeof assignmentInputSchema>): Promise<ProjectAssignment> {
  if (!can(user.permissions, "project.manage_team")) throw new AppError("PERMISSION_DENIED");
  const client = db();
  const project = await getProject(projectId);
  if (project.status === "closed") throw new AppError("CONFLICT", "Dự án đã đóng, không thể phân công mới.");
  if (input.worksiteId && !project.worksites.some((site) => site.id === input.worksiteId && site.status === "active")) throw new AppError("VALIDATION_ERROR", "Công trường không hoạt động hoặc không thuộc dự án.");
  const { data: current } = await client.from("project_assignments").select("*").eq("employee_id", input.employeeId).eq("status", "active");
  const conflict = (current ?? []).find((row) => rangesOverlap(input.startDate, input.endDate, row.start_date, row.end_date ?? undefined) && timesOverlap(input.shiftStart, input.shiftEnd, String(row.shift_start).slice(0, 5), String(row.shift_end).slice(0, 5)) && row.worksite_id !== (input.worksiteId ?? null));
  if (conflict) throw new AppError("CONFLICT", "Nhân sự này đã có phân công trùng thời gian tại công trường khác.");
  const accountId = await actorAccountId(client, user);
  const { data, error } = await client.from("project_assignments").insert({
    project_id: projectId, worksite_id: input.worksiteId || null, employee_id: input.employeeId, assignment_role: input.assignmentRole,
    start_date: input.startDate, end_date: input.endDate || null, shift_code: input.shiftCode, shift_name: input.shiftName,
    shift_start: input.shiftStart, shift_end: input.shiftEnd, note: input.note || null, assigned_by: accountId
  }).select(assignmentSelect).single();
  if (error || !data) throw new AppError(error?.code === "23505" ? "CONFLICT" : "SERVER_ERROR", error?.code === "23505" ? "Phân công này đã tồn tại." : "Không thể phân công nhân sự.");
  await recordAuditLog({ actorId: accountId ?? user.id, action: "project.assignment_created", entityType: "project_assignment", entityId: data.id, metadata: { projectId, employeeId: input.employeeId } });
  return mapAssignment(data as Row);
}

export async function getProjectRoster(projectId: string, date: string, worksiteId?: string): Promise<ProjectAssignment[]> {
  const client = db();
  let query = client.from("project_assignments").select(assignmentSelect).eq("project_id", projectId).eq("status", "active").lte("start_date", date).or("end_date.is.null,end_date.gte." + date);
  if (worksiteId) query = query.eq("worksite_id", worksiteId);
  const { data, error } = await query;
  if (error) throw new AppError("SERVER_ERROR", "Không thể tạo roster theo ngày.");
  const roster=(data ?? []).map((row) => mapAssignment(row as Row));
  const leaveByEmployee=await getApprovedLeaveForEmployeesDate(roster.map(item=>item.employeeId),date);
  return roster.map(item=>({...item,approvedLeave:leaveByEmployee.get(item.employeeId)}));
}

export async function getProjectSchedule(projectId: string, from: string, to: string): Promise<DailySchedule[]> {
  const project = await getProject(projectId);
  const result: DailySchedule[] = [];
  const cursor = new Date(from + "T12:00:00Z");
  const end = new Date(to + "T12:00:00Z");
  while (cursor <= end && result.length < 62 * Math.max(1, project.worksites.length)) {
    const date = cursor.toISOString().slice(0, 10);
    for (const site of project.worksites.filter((item) => item.status === "active")) {
      const roster = await getProjectRoster(projectId, date, site.id);
      result.push({ date, worksiteId: site.id, worksiteName: site.name, supervisorNames: roster.filter((item) => item.assignmentRole.startsWith("supervisor")).map((item) => item.employeeName), peopleCount: roster.length, workerCount: roster.filter((item) => item.assignmentRole === "worker").length });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}
