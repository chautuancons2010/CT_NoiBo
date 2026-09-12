import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import { AppError } from "@/lib/api/errors";
import { can, type AuthenticatedUser } from "@/lib/auth/permissions";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getProject, getProjectRoster } from "@/features/projects/services/projectRepository";
import type {
  createWorkerSessionSchema,
  closeWorkerDaySchema,
  existingWorkerSchema,
  temporaryWorkerSchema,
  workerAdjustmentSchema,
  workerSessionDraftSchema
} from "@/features/worker-attendance/schemas/workerAttendanceSchemas";
import { countWorkerAttendance, validateSessionForSubmit } from "@/features/worker-attendance/services/workerAttendanceRules";
import type {
  WorkerAttendanceAdjustment,
  WorkerAttendanceEntry,
  WorkerAttendancePhoto,
  WorkerAttendancePolicy,
  WorkerAttendanceSession,
  WorkerAttendanceTask
} from "@/features/worker-attendance/types/workerAttendanceTypes";
import { recordAuditLog } from "@/services/audit/auditLog";

type Row = Record<string, unknown>;

interface Identity {
  accountId: string;
  employeeId: string;
  employeeName: string;
}

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

const sessionSelect = "*,worker_attendance_entries(*),worker_attendance_photos(id,session_id,captured_at,sort_order),worker_attendance_adjustments(id,entry_id,reason,before_data,after_data,created_at)";

function mapEntry(row: Row): WorkerAttendanceEntry {
  return {
    id: required(row, "id"), sessionId: required(row, "session_id"), workerId: required(row, "worker_id"),
    employeeCode: required(row, "employee_code_snapshot"), workerName: required(row, "worker_name_snapshot"),
    assignmentRole: required(row, "assignment_role_snapshot"), status: required(row, "status") as WorkerAttendanceEntry["status"],
    exceptionReason: optional(row, "exception_reason") as WorkerAttendanceEntry["exceptionReason"],
    dayException: required(row, "day_exception") as WorkerAttendanceEntry["dayException"], exceptionTime: optional(row, "exception_time")?.slice(0, 5),
    isUnplanned: Boolean(row.is_unplanned), unplannedReason: optional(row, "unplanned_reason"), note: optional(row, "note")
  };
}

function mapPhoto(row: Row): WorkerAttendancePhoto {
  return { id: required(row, "id"), sessionId: required(row, "session_id"), capturedAt: required(row, "captured_at"), sortOrder: Number(row.sort_order) };
}

function mapAdjustment(row: Row): WorkerAttendanceAdjustment {
  return {
    id: required(row, "id"), entryId: optional(row, "entry_id"), reason: required(row, "reason"),
    before: (row.before_data ?? {}) as Record<string, unknown>, after: (row.after_data ?? {}) as Record<string, unknown>, createdAt: required(row, "created_at")
  };
}

function mapSession(row: Row): WorkerAttendanceSession {
  return {
    id: required(row, "id"), clientSessionId: required(row, "client_session_id"), projectId: required(row, "project_id"),
    projectName: required(row, "project_name_snapshot"), worksiteId: required(row, "worksite_id"), worksiteName: required(row, "worksite_name_snapshot"),
    date: required(row, "attendance_date"), shiftCode: required(row, "shift_code"), shiftName: required(row, "shift_name_snapshot"),
    sessionType: required(row, "session_type") as WorkerAttendanceSession["sessionType"], supervisorEmployeeId: required(row, "supervisor_employee_id"),
    supervisorName: required(row, "supervisor_name_snapshot"), startedAt: required(row, "started_at"), submittedAt: optional(row, "submitted_at"),
    dayClosedAt: optional(row, "day_closed_at"),
    capturedAtClient: required(row, "captured_at_client"), geofenceStatus: required(row, "geofence_status") as WorkerAttendanceSession["geofenceStatus"],
    distanceMeters: typeof row.distance_meters === "number" ? row.distance_meters : undefined,
    accuracyMeters: typeof row.accuracy_meters === "number" ? row.accuracy_meters : undefined,
    workNote: optional(row, "work_note"), note: optional(row, "note"), status: required(row, "status") as WorkerAttendanceSession["status"],
    syncStatus: required(row, "sync_status") as WorkerAttendanceSession["syncStatus"], photoStatus: required(row, "photo_status") as WorkerAttendanceSession["photoStatus"],
    version: Number(row.version), entries: ((row.worker_attendance_entries ?? []) as Row[]).map(mapEntry),
    photos: ((row.worker_attendance_photos ?? []) as Row[]).map(mapPhoto).sort((a, b) => a.sortOrder - b.sortOrder),
    adjustments: ((row.worker_attendance_adjustments ?? []) as Row[]).map(mapAdjustment)
  };
}

async function identity(client: SupabaseClient, user: AuthenticatedUser): Promise<Identity> {
  let query = client.from("app_accounts").select("id,employee_id,status,employees!app_accounts_employee_fk(full_name)").limit(1);
  query = /^[0-9a-f-]{36}$/i.test(user.id) ? query.eq("id", user.id) : query.eq("primary_email", user.email);
  const { data, error } = await query.maybeSingle();
  if (error || !data?.employee_id) throw new AppError("PERMISSION_DENIED", "Tài khoản chưa liên kết hồ sơ nhân viên.");
  if (data.status !== "active") throw new AppError("PERMISSION_DENIED", "Tài khoản không hoạt động.");
  return { accountId: String(data.id), employeeId: String(data.employee_id), employeeName: required(data.employees as unknown as Row, "full_name") };
}

async function policy(client: SupabaseClient): Promise<WorkerAttendancePolicy> {
  const { data, error } = await client.from("worker_attendance_policies").select("*").eq("active", true).maybeSingle();
  if (error || !data) throw new AppError("SERVER_ERROR", "Chưa có chính sách điểm danh công nhân.");
  return { minimumPhotos: data.minimum_photos, workNoteRequired: data.work_note_required, endOfDayRequired: data.end_of_day_required, offlineEnabled: data.offline_enabled, editWindowMinutes: data.edit_window_minutes };
}

function distanceMeters(latitude: number, longitude: number, targetLatitude: number, targetLongitude: number): number {
  const radians = (value: number) => value * Math.PI / 180;
  const lat = radians(targetLatitude - latitude);
  const lng = radians(targetLongitude - longitude);
  const value = Math.sin(lat / 2) ** 2 + Math.cos(radians(latitude)) * Math.cos(radians(targetLatitude)) * Math.sin(lng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

async function assertProjectScope(client: SupabaseClient, user: AuthenticatedUser, employeeId: string, projectId: string, worksiteId: string, date: string) {
  if (can(user.permissions, "worker_attendance.view_all")) return;
  const { data } = await client.from("project_assignments").select("id").eq("project_id", projectId).eq("worksite_id", worksiteId).eq("employee_id", employeeId).in("assignment_role", ["supervisor_main", "supervisor_replacement", "project_manager"]).eq("status", "active").lte("start_date", date).or("end_date.is.null,end_date.gte." + date).limit(1);
  if (!data?.length) throw new AppError("PERMISSION_DENIED", "Bạn không được phân công điểm danh công trường này trong ngày đã chọn.");
}

export async function listTodayTasks(user: AuthenticatedUser, date: string): Promise<{ accountId: string; tasks: WorkerAttendanceTask[]; policy: WorkerAttendancePolicy }> {
  const client = db();
  const actor = await identity(client, user);
  let query = client.from("project_assignments").select("project_id,worksite_id,shift_code,shift_name,projects(name,status),worksites(name,status)").eq("status", "active").in("assignment_role", ["supervisor_main", "supervisor_replacement", "project_manager"]).lte("start_date", date).or("end_date.is.null,end_date.gte." + date);
  if (!can(user.permissions, "worker_attendance.view_all")) query = query.eq("employee_id", actor.employeeId);
  const [{ data, error }, workerPolicy] = await Promise.all([query, policy(client)]);
  if (error) throw new AppError("SERVER_ERROR", "Không thể tải lịch điểm danh hôm nay.");
  const tasks: WorkerAttendanceTask[] = [];
  for (const row of data ?? []) {
    const project = nested(row as Row, "projects");
    const worksite = nested(row as Row, "worksites");
    if (!row.worksite_id || !project || !worksite || project.status === "closed" || worksite.status !== "active") continue;
    const roster = await getProjectRoster(String(row.project_id), date, String(row.worksite_id));
    const { data: session } = await client.from("worker_attendance_sessions").select("id,status").eq("project_id", row.project_id).eq("worksite_id", row.worksite_id).eq("attendance_date", date).eq("shift_code", row.shift_code).eq("session_type", "morning").maybeSingle();
    const workers = roster.filter((item) => item.assignmentRole === "worker");
    tasks.push({ projectId: String(row.project_id), projectName: required(project, "name"), worksiteId: String(row.worksite_id), worksiteName: required(worksite, "name"), date, shiftCode: String(row.shift_code), shiftName: String(row.shift_name), expectedWorkers: workers.length, existingSessionId: session?.id, existingStatus: session?.status, roster: workers.map((worker) => ({ workerId: worker.employeeId, employeeCode: worker.employeeCode, workerName: worker.employeeName, assignmentRole: worker.assignmentRole, approvedLeave: worker.approvedLeave })) });
  }
  return { accountId: actor.accountId, tasks, policy: workerPolicy };
}

export async function listWorkerSessions(user: AuthenticatedUser, filters: { from?: string; to?: string; projectId?: string; status?: string } = {}): Promise<WorkerAttendanceSession[]> {
  const client = db();
  const actor = await identity(client, user);
  let query = client.from("worker_attendance_sessions").select(sessionSelect).order("attendance_date", { ascending: false }).limit(200);
  if (!can(user.permissions, "worker_attendance.view_all")) query = query.eq("supervisor_employee_id", actor.employeeId);
  if (filters.from) query = query.gte("attendance_date", filters.from);
  if (filters.to) query = query.lte("attendance_date", filters.to);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.status) query = query.eq("status", filters.status);
  const { data, error } = await query;
  if (error) throw new AppError("SERVER_ERROR", "Không thể đọc danh sách phiên điểm danh.");
  return (data ?? []).map((row) => mapSession(row as Row));
}

export async function getWorkerSession(user: AuthenticatedUser, sessionId: string): Promise<WorkerAttendanceSession> {
  const client = db();
  const actor = await identity(client, user);
  const { data, error } = await client.from("worker_attendance_sessions").select(sessionSelect).eq("id", sessionId).maybeSingle();
  if (error || !data) throw new AppError("NOT_FOUND", "Không tìm thấy phiên điểm danh.");
  await assertProjectScope(client, user, actor.employeeId, data.project_id, data.worksite_id, data.attendance_date);
  return mapSession(data as Row);
}

export async function createWorkerSession(user: AuthenticatedUser, input: z.infer<typeof createWorkerSessionSchema>): Promise<{ session: WorkerAttendanceSession; idempotentReplay: boolean }> {
  if (!can(user.permissions, "worker_attendance.create")) throw new AppError("PERMISSION_DENIED");
  const client = db();
  const actor = await identity(client, user);
  const { data: replay } = await client.from("worker_attendance_sessions").select(sessionSelect).eq("client_session_id", input.clientSessionId).maybeSingle();
  if (replay) return { session: mapSession(replay as Row), idempotentReplay: true };
  await assertProjectScope(client, user, actor.employeeId, input.projectId, input.worksiteId, input.date);
  const project = await getProject(input.projectId);
  if (project.status === "closed") throw new AppError("CONFLICT", "Dự án đã đóng.");
  const worksite = project.worksites.find((item) => item.id === input.worksiteId && item.status === "active");
  if (!worksite) throw new AppError("VALIDATION_ERROR", "Công trường không hoạt động.");
  const roster = (await getProjectRoster(input.projectId, input.date, input.worksiteId)).filter((item) => item.assignmentRole === "worker");
  let geofenceStatus: WorkerAttendanceSession["geofenceStatus"] = worksite.gpsRequired ? "unavailable" : "not_required";
  let distance: number | undefined;
  if (input.location) {
    const { data: siteRow } = await client.from("worksites").select("latitude,longitude").eq("id", input.worksiteId).single();
    if (input.location.accuracy > worksite.allowedAccuracyThresholdMeters) geofenceStatus = "accuracy_low";
    else if (siteRow?.latitude == null || siteRow?.longitude == null) geofenceStatus = "unavailable";
    else { distance = distanceMeters(input.location.latitude, input.location.longitude, siteRow.latitude, siteRow.longitude); geofenceStatus = distance <= worksite.radiusMeters ? "valid" : "outside"; }
  }
  const { data, error } = await client.from("worker_attendance_sessions").insert({
    client_session_id: input.clientSessionId, project_id: project.id, project_name_snapshot: project.name,
    worksite_id: worksite.id, worksite_name_snapshot: worksite.name, attendance_date: input.date,
    shift_code: input.shiftCode, shift_name_snapshot: roster[0]?.shiftName ?? "Ca ngày", session_type: input.sessionType,
    supervisor_employee_id: actor.employeeId, supervisor_name_snapshot: actor.employeeName,
    captured_at_client: input.capturedAtClient, latitude: input.location?.latitude ?? null, longitude: input.location?.longitude ?? null,
    accuracy_meters: input.location?.accuracy ?? null, distance_meters: distance ?? null, geofence_status: geofenceStatus,
    status: "in_progress", sync_status: "syncing", created_by: actor.accountId
  }).select("id").single();
  if (error || !data) {
    const { data: existing } = await client.from("worker_attendance_sessions").select(sessionSelect).eq("project_id", input.projectId).eq("worksite_id", input.worksiteId).eq("attendance_date", input.date).eq("shift_code", input.shiftCode).eq("session_type", input.sessionType).maybeSingle();
    if (existing) return { session: mapSession(existing as Row), idempotentReplay: true };
    throw new AppError("SERVER_ERROR", "Không thể tạo phiên điểm danh.");
  }
  if (roster.length) {
    const { error: entryError } = await client.from("worker_attendance_entries").insert(roster.map((worker) => ({ session_id: data.id, worker_id: worker.employeeId, employee_code_snapshot: worker.employeeCode, worker_name_snapshot: worker.employeeName, assignment_role_snapshot: worker.assignmentRole, status: worker.approvedLeave ? "leave" : "unconfirmed", exception_reason: worker.approvedLeave ? "approved_leave" : null })));
    if (entryError) { await client.from("worker_attendance_sessions").delete().eq("id", data.id); throw new AppError("SERVER_ERROR", "Không thể tạo snapshot roster."); }
  }
  await recordAuditLog({ actorId: actor.accountId, action: "worker_attendance.session_created", entityType: "worker_attendance_session", entityId: data.id, metadata: { projectId: project.id, worksiteId: worksite.id, rosterCount: roster.length } });
  return { session: await getWorkerSession(user, data.id), idempotentReplay: false };
}

export async function saveWorkerSessionDraft(user: AuthenticatedUser, sessionId: string, input: z.infer<typeof workerSessionDraftSchema>): Promise<WorkerAttendanceSession> {
  if (!can(user.permissions, "worker_attendance.create")) throw new AppError("PERMISSION_DENIED");
  const client = db();
  const actor = await identity(client, user);
  const session = await getWorkerSession(user, sessionId);
  if (session.status === "submitted" || session.status === "locked") throw new AppError("CONFLICT", "Phiên đã gửi, không thể sửa bản nháp.");
  if (session.version !== input.version) throw new AppError("CONFLICT", "Dữ liệu đã được cập nhật từ thiết bị khác.");
  const knownIds = new Set(session.entries.map((entry) => entry.id));
  if (input.entries.some((entry) => !knownIds.has(entry.id))) throw new AppError("VALIDATION_ERROR", "Danh sách công nhân không thuộc phiên này.");
  const { data, error } = await client.from("worker_attendance_sessions").update({ work_note: input.workNote ?? null, note: input.note ?? null, status: "in_progress", sync_status: "synced", latitude: input.location?.latitude, longitude: input.location?.longitude, accuracy_meters: input.location?.accuracy }).eq("id", sessionId).eq("version", input.version).select("id").maybeSingle();
  if (error || !data) throw new AppError("CONFLICT", "Dữ liệu đã được cập nhật từ thiết bị khác.");
  for (const entry of input.entries) {
    const { error } = await client.from("worker_attendance_entries").update({ status: entry.status, exception_reason: entry.exceptionReason ?? null, day_exception: entry.dayException, exception_time: entry.exceptionTime ?? null, note: entry.note ?? null }).eq("id", entry.id).eq("session_id", sessionId);
    if (error) throw new AppError("SERVER_ERROR", "Không thể lưu trạng thái công nhân.");
  }
  await recordAuditLog({ actorId: actor.accountId, action: "worker_attendance.draft_saved", entityType: "worker_attendance_session", entityId: sessionId });
  return getWorkerSession(user, sessionId);
}

function isJpeg(bytes: Uint8Array) { return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff; }
async function validatePhoto(file: File) {
  if (!file.size || file.size > 2 * 1024 * 1024) throw new AppError("PHOTO_UPLOAD", "Ảnh phải nhỏ hơn 2 MB.");
  if (file.type !== "image/jpeg" || !isJpeg(new Uint8Array(await file.slice(0, 4).arrayBuffer()))) throw new AppError("PHOTO_UPLOAD", "Ảnh phải là JPEG hợp lệ.");
}

export async function uploadWorkerPhoto(user: AuthenticatedUser, sessionId: string, input: { photo: File; thumbnail: File; width: number; height: number; capturedAt: string }): Promise<WorkerAttendanceSession> {
  if (!can(user.permissions, "worker_attendance.create")) throw new AppError("PERMISSION_DENIED");
  const client = db();
  const actor = await identity(client, user);
  const session = await getWorkerSession(user, sessionId);
  if (session.status === "locked") throw new AppError("CONFLICT", "Phiên đã khóa.");
  await Promise.all([validatePhoto(input.photo), validatePhoto(input.thumbnail)]);
  const photoId = crypto.randomUUID();
  const prefix = `${session.date.slice(0, 7).replace("-", "/")}/${session.projectId}/${sessionId}/${photoId}`;
  const paths = [`${prefix}.jpg`, `${prefix}-thumb.jpg`];
  const uploaded: string[] = [];
  try {
    for (const [index, file] of [input.photo, input.thumbnail].entries()) {
      const { error } = await client.storage.from("worker-attendance-photos").upload(paths[index], file, { contentType: "image/jpeg", upsert: false });
      if (error) throw new AppError("PHOTO_UPLOAD", "Ảnh chưa thể đồng bộ.");
      uploaded.push(paths[index]);
    }
    const fullId = crypto.randomUUID(); const thumbId = crypto.randomUUID();
    const { error: assetError } = await client.from("file_assets").insert([
      { id: fullId, bucket: "worker-attendance-photos", object_path: paths[0], owner_entity_type: "worker_attendance_session", owner_entity_id: sessionId, mime_type: "image/jpeg", byte_size: input.photo.size, visibility: "private", created_by: actor.accountId, metadata: { derivative: "full" } },
      { id: thumbId, bucket: "worker-attendance-photos", object_path: paths[1], owner_entity_type: "worker_attendance_session", owner_entity_id: sessionId, mime_type: "image/jpeg", byte_size: input.thumbnail.size, visibility: "private", created_by: actor.accountId, metadata: { derivative: "thumbnail" } }
    ]);
    if (assetError) throw new AppError("PHOTO_UPLOAD", "Không thể lưu thông tin ảnh.");
    const { error: photoError } = await client.from("worker_attendance_photos").insert({ id: photoId, session_id: sessionId, file_id: fullId, thumbnail_file_id: thumbId, captured_at: input.capturedAt, sort_order: session.photos.length, width: input.width, height: input.height, metadata: { normalizedOrientation: true } });
    if (photoError) throw new AppError("PHOTO_UPLOAD", "Không thể liên kết ảnh với phiên.");
    await client.from("worker_attendance_sessions").update({ photo_status: "uploaded" }).eq("id", sessionId);
    await recordAuditLog({ actorId: actor.accountId, action: "worker_attendance.photo_linked", entityType: "worker_attendance_session", entityId: sessionId, metadata: { photoId } });
    return getWorkerSession(user, sessionId);
  } catch (error) {
    if (uploaded.length) await client.storage.from("worker-attendance-photos").remove(uploaded);
    await client.from("worker_attendance_sessions").update({ photo_status: "upload_failed", sync_status: "sync_failed" }).eq("id", sessionId);
    throw error;
  }
}

export async function submitWorkerSession(user: AuthenticatedUser, sessionId: string, version: number): Promise<WorkerAttendanceSession> {
  if (!can(user.permissions, "worker_attendance.create")) throw new AppError("PERMISSION_DENIED");
  const client = db(); const actor = await identity(client, user); const session = await getWorkerSession(user, sessionId);
  if (session.status === "submitted" || session.status === "locked") return session;
  if (session.version !== version) throw new AppError("CONFLICT", "Dữ liệu đã được cập nhật từ thiết bị khác.");
  const errors = validateSessionForSubmit({ entries: session.entries, photoCount: session.photos.length, workNote: session.workNote, geofenceStatus: session.geofenceStatus }, await policy(client));
  if (errors.length) throw new AppError("VALIDATION_ERROR", errors.join(" "));
  const { data, error } = await client.from("worker_attendance_sessions").update({ status: "submitted", submitted_at: new Date().toISOString(), sync_status: "synced" }).eq("id", sessionId).eq("version", version).select("id").maybeSingle();
  if (error || !data) throw new AppError("CONFLICT", "Phiên vừa được cập nhật từ thiết bị khác.");
  await recordAuditLog({ actorId: actor.accountId, action: "worker_attendance.submitted", entityType: "worker_attendance_session", entityId: sessionId, after: { ...countWorkerAttendance(session.entries) } });
  return getWorkerSession(user, sessionId);
}

export async function addTemporaryWorker(user: AuthenticatedUser, sessionId: string, input: z.infer<typeof temporaryWorkerSchema>): Promise<WorkerAttendanceSession> {
  if (!can(user.permissions, "worker_attendance.create")) throw new AppError("PERMISSION_DENIED");
  const client = db(); const actor = await identity(client, user); const session = await getWorkerSession(user, sessionId);
  if (session.status === "submitted" || session.status === "locked") throw new AppError("CONFLICT", "Phiên đã gửi.");
  if (input.phone) {
    const normalized = input.phone.replace(/\D/g, "").replace(/^0/, "84");
    const { data: similar } = await client.from("employees").select("id,full_name,employee_code").or(`normalized_phone.eq.${normalized},full_name.ilike.%${input.fullName.replace(/[%_,]/g, "")}%`).limit(5);
    if (similar?.length) throw new AppError("CONFLICT", "Có thể người này đã tồn tại. Hãy chọn hồ sơ hiện có.", { candidates: similar });
  }
  const [{ data: department }, { data: position }, { data: employmentType }] = await Promise.all([
    client.from("departments").select("id").eq("code", "construction").single(), client.from("positions").select("id").eq("code", "worker").single(), client.from("employment_types").select("id").eq("code", "worker").single()
  ]);
  const employeeCode = "TMP-" + Date.now().toString(36).toUpperCase();
  const { data: worker, error } = await client.from("employees").insert({ employee_code: employeeCode, full_name: input.fullName, display_name: input.fullName, personal_phone: input.phone || "Chưa cập nhật", normalized_phone: input.phone?.replace(/\D/g, "").replace(/^0/, "84") || employeeCode, department_id: department!.id, position_id: position!.id, employment_type_id: employmentType!.id, contractor_name: input.contractorName || null, join_date: session.date, employment_status: "pending_onboarding", profile_status: "pending_hr_completion", profile_completeness: 20, note: input.note || "Tạo từ điểm danh công nhân", created_by: actor.accountId }).select("id").single();
  if (error || !worker) throw new AppError("SERVER_ERROR", "Không thể tạo hồ sơ công nhân tạm.");
  const { error: entryError } = await client.from("worker_attendance_entries").insert({ session_id: sessionId, worker_id: worker.id, employee_code_snapshot: employeeCode, worker_name_snapshot: input.fullName, assignment_role_snapshot: "worker", status: "unconfirmed", is_unplanned: true, unplanned_reason: input.unplannedReason });
  if (entryError) throw new AppError("SERVER_ERROR", "Không thể thêm công nhân vào phiên.");
  await client.from("worker_attendance_sessions").update({ sync_status: "synced" }).eq("id", sessionId);
  await recordAuditLog({ actorId: actor.accountId, action: "worker_attendance.temporary_worker_added", entityType: "worker_attendance_session", entityId: sessionId, metadata: { workerId: worker.id } });
  return getWorkerSession(user, sessionId);
}

export async function addExistingWorker(user: AuthenticatedUser, sessionId: string, input: z.infer<typeof existingWorkerSchema>): Promise<WorkerAttendanceSession> {
  if (!can(user.permissions, "worker_attendance.create")) throw new AppError("PERMISSION_DENIED");
  const client = db();
  const actor = await identity(client, user);
  const session = await getWorkerSession(user, sessionId);
  if (session.status === "submitted" || session.status === "locked") throw new AppError("CONFLICT", "Phiên đã gửi.");
  if (session.entries.some((entry) => entry.workerId === input.workerId)) throw new AppError("CONFLICT", "Công nhân đã có trong danh sách.");
  const { data: worker, error } = await client.from("employees").select("id,employee_code,full_name,employment_status").eq("id", input.workerId).maybeSingle();
  if (error || !worker) throw new AppError("NOT_FOUND", "Không tìm thấy hồ sơ công nhân.");
  if (!["active", "probation", "pending_onboarding"].includes(worker.employment_status)) throw new AppError("CONFLICT", "Hồ sơ công nhân không còn hoạt động.");
  const { error: entryError } = await client.from("worker_attendance_entries").insert({ session_id: sessionId, worker_id: worker.id, employee_code_snapshot: worker.employee_code, worker_name_snapshot: worker.full_name, assignment_role_snapshot: "worker", status: "unconfirmed", is_unplanned: true, unplanned_reason: input.unplannedReason });
  if (entryError) throw new AppError(entryError.code === "23505" ? "CONFLICT" : "SERVER_ERROR", entryError.code === "23505" ? "Công nhân đã có trong danh sách." : "Không thể thêm công nhân.");
  await client.from("worker_attendance_sessions").update({ sync_status: "synced" }).eq("id", sessionId);
  await recordAuditLog({ actorId: actor.accountId, action: "worker_attendance.existing_worker_added", entityType: "worker_attendance_session", entityId: sessionId, metadata: { workerId: worker.id, unplannedReason: input.unplannedReason } });
  return getWorkerSession(user, sessionId);
}

export async function closeWorkerSessionDay(user: AuthenticatedUser, sessionId: string, input: z.infer<typeof closeWorkerDaySchema>): Promise<WorkerAttendanceSession> {
  if (!can(user.permissions, "worker_attendance.create") && !can(user.permissions, "worker_attendance.adjust")) throw new AppError("PERMISSION_DENIED");
  const client = db();
  const actor = await identity(client, user);
  const session = await getWorkerSession(user, sessionId);
  if (!session.submittedAt) throw new AppError("CONFLICT", "Cần gửi điểm danh buổi sáng trước khi chốt ngày.");
  if (session.dayClosedAt) return session;
  if (session.version !== input.version) throw new AppError("CONFLICT", "Dữ liệu đã được cập nhật từ thiết bị khác.");
  const knownEntries = new Map(session.entries.map((entry) => [entry.id, entry]));
  if (input.entries.some((entry) => !knownEntries.has(entry.id))) throw new AppError("VALIDATION_ERROR", "Danh sách công nhân không thuộc phiên này.");
  const { data: claimed, error: claimError } = await client.from("worker_attendance_sessions").update({ day_closed_at: new Date().toISOString(), day_closed_by: actor.accountId }).eq("id", sessionId).eq("version", input.version).select("id").maybeSingle();
  if (claimError || !claimed) throw new AppError("CONFLICT", "Dữ liệu đã được cập nhật từ thiết bị khác.");
  const adjustments: Row[] = [];
  for (const change of input.entries) {
    const before = knownEntries.get(change.id)!;
    if (before.dayException === change.dayException && (before.exceptionTime ?? null) === (change.exceptionTime ?? null)) continue;
    const { error } = await client.from("worker_attendance_entries").update({ day_exception: change.dayException, exception_time: change.exceptionTime ?? null }).eq("id", change.id).eq("session_id", sessionId);
    if (error) throw new AppError("SERVER_ERROR", "Không thể lưu ngoại lệ cuối ngày.");
    adjustments.push({ session_id: sessionId, entry_id: change.id, actor_account_id: actor.accountId, reason: input.reason, before_data: { dayException: before.dayException, exceptionTime: before.exceptionTime ?? null }, after_data: { dayException: change.dayException, exceptionTime: change.exceptionTime ?? null } });
  }
  if (adjustments.length) {
    const { error } = await client.from("worker_attendance_adjustments").insert(adjustments);
    if (error) throw new AppError("SERVER_ERROR", "Không thể lưu lịch sử chốt ngày.");
  }
  await recordAuditLog({ actorId: actor.accountId, action: "worker_attendance.day_closed", entityType: "worker_attendance_session", entityId: sessionId, reason: input.reason, metadata: { exceptionCount: adjustments.length } });
  return getWorkerSession(user, sessionId);
}

export async function adjustWorkerEntry(user: AuthenticatedUser, sessionId: string, input: z.infer<typeof workerAdjustmentSchema>): Promise<WorkerAttendanceSession> {
  if (!can(user.permissions, "worker_attendance.adjust")) throw new AppError("PERMISSION_DENIED");
  const client = db(); const actor = await identity(client, user); const session = await getWorkerSession(user, sessionId);
  if (session.version !== input.version) throw new AppError("CONFLICT", "Dữ liệu đã được cập nhật từ thiết bị khác.");
  const entry = session.entries.find((item) => item.id === input.entryId);
  if (!entry) throw new AppError("NOT_FOUND", "Không tìm thấy công nhân trong phiên.");
  const before = { status: entry.status }; const after = { status: input.status };
  const { data: claimed } = await client.from("worker_attendance_sessions").update({ status: "needs_review" }).eq("id", sessionId).eq("version", input.version).select("id").maybeSingle();
  if (!claimed) throw new AppError("CONFLICT", "Dữ liệu đã được cập nhật từ thiết bị khác.");
  await client.from("worker_attendance_entries").update({ status: input.status }).eq("id", entry.id).eq("session_id", sessionId);
  await client.from("worker_attendance_adjustments").insert({ session_id: sessionId, entry_id: entry.id, actor_account_id: actor.accountId, reason: input.reason, before_data: before, after_data: after });
  await recordAuditLog({ actorId: actor.accountId, action: "worker_attendance.adjusted", entityType: "worker_attendance_session", entityId: sessionId, before, after, reason: input.reason });
  return getWorkerSession(user, sessionId);
}

export async function getWorkerPhotoAsset(user: AuthenticatedUser, photoId: string, thumbnail: boolean) {
  const client = db(); const actor = await identity(client, user);
  const { data, error } = await client.from("worker_attendance_photos").select("session_id,worker_attendance_sessions(project_id,worksite_id,attendance_date),file_assets!worker_attendance_photos_file_id_fkey(bucket,object_path),thumbnail:file_assets!worker_attendance_photos_thumbnail_file_id_fkey(bucket,object_path)").eq("id", photoId).maybeSingle();
  if (error || !data) throw new AppError("NOT_FOUND", "Không tìm thấy ảnh điểm danh.");
  const session = data.worker_attendance_sessions as unknown as Row;
  await assertProjectScope(client, user, actor.employeeId, required(session, "project_id"), required(session, "worksite_id"), required(session, "attendance_date"));
  if (!can(user.permissions, "worker_attendance.view_photo") && !can(user.permissions, "worker_attendance.create")) throw new AppError("PERMISSION_DENIED");
  const asset = (thumbnail ? data.thumbnail : data.file_assets) as unknown as Row | undefined;
  if (!asset) throw new AppError("NOT_FOUND", "Ảnh chưa đồng bộ.");
  return { bucket: required(asset, "bucket"), path: required(asset, "object_path") };
}
