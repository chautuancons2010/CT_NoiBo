import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "@/lib/api/errors";
import { can, type AuthenticatedUser } from "@/lib/auth/permissions";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { matchAttendanceLocation, getNextAttendanceAction } from "@/features/attendance/services/attendanceRules";
import type {
  AttendanceDashboard,
  AttendanceEvent,
  AttendanceHistoryDay,
  AttendanceLocation,
  AttendancePolicy,
  AttendanceRecordInput,
  AttendanceRecordResult
} from "@/features/attendance/types/attendanceTypes";
import { recordAuditLog } from "@/services/audit/auditLog";

type Row = Record<string, unknown>;

interface AttendanceIdentity {
  accountId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
}

function clientOrThrow(): SupabaseClient {
  const client = getSupabaseServiceClient();
  if (!client) {
    throw new AppError("SERVER_ERROR", "Supabase chưa được cấu hình cho chấm công.");
  }
  return client;
}

function requiredString(row: Row, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || !value) throw new AppError("SERVER_ERROR", `Dữ liệu thiếu ${key}.`);
  return value;
}

function optionalString(row: Row, key: string): string | undefined {
  const value = row[key];
  return typeof value === "string" && value ? value : undefined;
}

function numberValue(row: Row, key: string): number | undefined {
  const value = row[key];
  return typeof value === "number" ? value : undefined;
}

function localDate(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(instant);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function mapPolicy(row: Row): AttendancePolicy {
  return {
    id: requiredString(row, "id"),
    name: requiredString(row, "name"),
    attendanceEnabled: Boolean(row.attendance_enabled),
    photoRequired: Boolean(row.photo_required),
    gpsRequired: Boolean(row.gps_required),
    offlineEnabled: Boolean(row.offline_enabled),
    allowedAccuracyThresholdMeters: Number(row.allowed_accuracy_threshold_meters),
    earlyCheckinWindowMinutes: Number(row.early_checkin_window_minutes),
    lateThresholdMinutes: Number(row.late_threshold_minutes),
    shiftName: requiredString(row, "shift_name"),
    shiftStart: requiredString(row, "shift_start").slice(0, 5),
    shiftEnd: requiredString(row, "shift_end").slice(0, 5),
    timezone: requiredString(row, "timezone")
  };
}

function mapLocation(row: Row): AttendanceLocation {
  return {
    id: requiredString(row, "id"),
    name: requiredString(row, "name"),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    radiusMeters: Number(row.radius_meters),
    active: Boolean(row.active)
  };
}

function mapEvent(row: Row): AttendanceEvent {
  const location = row.attendance_locations as Row | null | undefined;
  const employee = row.employees as Row | null | undefined;
  const photos = row.attendance_photos as Row[] | Row | null | undefined;
  const photo = Array.isArray(photos) ? photos[0] : photos;
  return {
    id: requiredString(row, "id"),
    clientEventId: requiredString(row, "client_event_id"),
    employeeId: requiredString(row, "employee_id"),
    employeeName: employee ? optionalString(employee, "full_name") : undefined,
    employeeCode: employee ? optionalString(employee, "employee_code") : undefined,
    eventType: requiredString(row, "event_type") as AttendanceEvent["eventType"],
    attendanceDate: requiredString(row, "attendance_date"),
    effectiveAt: requiredString(row, "effective_at"),
    capturedAtClient: requiredString(row, "captured_at_client"),
    receivedAtServer: requiredString(row, "received_at_server"),
    locationId: optionalString(row, "location_id"),
    locationName: location ? optionalString(location, "name") : undefined,
    accuracyMeters: numberValue(row, "accuracy_meters"),
    distanceMeters: numberValue(row, "distance_meters"),
    geofenceStatus: requiredString(row, "geofence_status") as AttendanceEvent["geofenceStatus"],
    attendanceStatus: requiredString(row, "attendance_status") as AttendanceEvent["attendanceStatus"],
    photoStatus: requiredString(row, "photo_status") as AttendanceEvent["photoStatus"],
    syncStatus: requiredString(row, "sync_status") as AttendanceEvent["syncStatus"],
    photoId: photo ? optionalString(photo, "id") : undefined,
    anomalyFlags: Array.isArray(row.anomaly_flags) ? row.anomaly_flags.filter((item): item is string => typeof item === "string") : []
  };
}

const eventSelect = "*,attendance_locations(name),employees(full_name,employee_code),attendance_photos(id)";

async function resolveIdentity(client: SupabaseClient, user: AuthenticatedUser): Promise<AttendanceIdentity> {
  let query = client
    .from("app_accounts")
    .select("id,employee_id,status,employees!app_accounts_employee_fk(full_name,employee_code)")
    .limit(1);
  query = /^[0-9a-f-]{36}$/i.test(user.id) ? query.eq("id", user.id) : query.eq("primary_email", user.email);
  const { data, error } = await query.maybeSingle();
  if (error) throw new AppError("SERVER_ERROR", "Không thể đọc tài khoản chấm công.");
  if (!data?.employee_id) {
    throw new AppError("PERMISSION_DENIED", "Tài khoản chưa liên kết với hồ sơ nhân viên.");
  }
  if (data.status !== "active") throw new AppError("PERMISSION_DENIED", "Tài khoản không hoạt động.");
  const employee = data.employees as unknown as Row | null;
  return {
    accountId: String(data.id),
    employeeId: String(data.employee_id),
    employeeName: employee ? requiredString(employee, "full_name") : user.displayName,
    employeeCode: employee ? requiredString(employee, "employee_code") : ""
  };
}

async function readPolicy(client: SupabaseClient): Promise<AttendancePolicy> {
  const { data, error } = await client.from("attendance_policies").select("*").eq("active", true).maybeSingle();
  if (error || !data) throw new AppError("SERVER_ERROR", "Chưa có chính sách chấm công đang hoạt động.");
  return mapPolicy(data as Row);
}

async function readLocations(client: SupabaseClient, employeeId?: string): Promise<AttendanceLocation[]> {
  if (employeeId) {
    const { data: assignments, error } = await client
      .from("employee_attendance_locations")
      .select("attendance_locations(*)")
      .eq("employee_id", employeeId);
    if (error) throw new AppError("SERVER_ERROR", "Không thể đọc địa điểm được phép.");
    const assigned = (assignments ?? [])
      .map((item) => item.attendance_locations as unknown as Row | null)
      .filter((item): item is Row => Boolean(item))
      .map(mapLocation)
      .filter((item) => item.active);
    if (assigned.length > 0) return assigned;
  }
  const { data, error } = await client.from("attendance_locations").select("*").eq("active", true).order("name");
  if (error) throw new AppError("SERVER_ERROR", "Không thể đọc địa điểm chấm công.");
  return (data ?? []).map((row) => mapLocation(row as Row));
}

async function readEvents(
  client: SupabaseClient,
  filters: { employeeId?: string; date?: string; from?: string; to?: string; limit?: number } = {}
): Promise<AttendanceEvent[]> {
  let query = client.from("attendance_events").select(eventSelect).order("effective_at", { ascending: false });
  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.date) query = query.eq("attendance_date", filters.date);
  if (filters.from) query = query.gte("attendance_date", filters.from);
  if (filters.to) query = query.lte("attendance_date", filters.to);
  if (filters.limit) query = query.limit(filters.limit);
  const { data, error } = await query;
  if (error) throw new AppError("SERVER_ERROR", "Không thể đọc dữ liệu chấm công.");
  return (data ?? []).map((row) => mapEvent(row as Row));
}

export async function getAttendanceDashboard(user: AuthenticatedUser): Promise<AttendanceDashboard> {
  const client = clientOrThrow();
  const identity = await resolveIdentity(client, user);
  const policy = await readPolicy(client);
  const today = localDate(new Date(), policy.timezone);
  const [locations, todayEvents, recentEvents] = await Promise.all([
    readLocations(client, identity.employeeId),
    readEvents(client, { employeeId: identity.employeeId, date: today }),
    readEvents(client, { employeeId: identity.employeeId, limit: 20 })
  ]);
  const days = new Map<string, AttendanceEvent[]>();
  for (const event of recentEvents) days.set(event.attendanceDate, [...(days.get(event.attendanceDate) ?? []), event]);
  const incompletePreviousDate = [...days.entries()]
    .find(([date, events]) => date !== today && getNextAttendanceAction(events) === "check_out")?.[0];
  return {
    ...identity,
    policy,
    locations,
    todayEvents: [...todayEvents].reverse(),
    lastEvent: recentEvents[0],
    nextAction: getNextAttendanceAction(todayEvents),
    incompletePreviousDate
  };
}

export async function recordAttendance(
  user: AuthenticatedUser,
  input: AttendanceRecordInput
): Promise<AttendanceRecordResult> {
  const client = clientOrThrow();
  const identity = await resolveIdentity(client, user);
  const { data: replay } = await client
    .from("attendance_events")
    .select(eventSelect)
    .eq("client_event_id", input.clientEventId)
    .maybeSingle();
  if (replay) return { event: mapEvent(replay as Row), idempotentReplay: true };

  const [policy, locations] = await Promise.all([readPolicy(client), readLocations(client, identity.employeeId)]);
  if (!policy.attendanceEnabled) throw new AppError("PERMISSION_DENIED", "Chức năng chấm công đang tạm khóa.");
  if (input.capturedOffline && !policy.offlineEnabled) {
    throw new AppError("NETWORK_ERROR", "Chính sách hiện tại không cho phép chấm công khi ngoại tuyến.");
  }

  const serverNow = new Date();
  const capturedAt = new Date(input.capturedAtClient);
  const ageMilliseconds = serverNow.getTime() - capturedAt.getTime();
  if (ageMilliseconds > 48 * 60 * 60 * 1000 || ageMilliseconds < -5 * 60 * 1000) {
    throw new AppError("VALIDATION_ERROR", "Thời gian ghi nhận trên thiết bị không hợp lệ.");
  }

  const match = matchAttendanceLocation(input.location, locations, policy);
  if (match.status === "unavailable") throw new AppError("LOCATION_UNAVAILABLE");
  if (match.status === "accuracy_low") throw new AppError("LOCATION_ACCURACY_LOW");
  if (match.status === "outside") throw new AppError("LOCATION_OUTSIDE_GEOFENCE");

  const effectiveAt = input.capturedOffline ? capturedAt : serverNow;
  const attendanceDate = localDate(effectiveAt, policy.timezone);
  const existing = await readEvents(client, { employeeId: identity.employeeId, date: attendanceDate });
  const eventType = getNextAttendanceAction(existing);
  if (eventType === "completed") {
    throw new AppError("DUPLICATE", "Bạn đã hoàn tất chấm vào và chấm ra trong ngày này.");
  }

  const anomalyFlags: string[] = [];
  if (!input.capturedOffline && Math.abs(ageMilliseconds) > 15 * 60 * 1000) anomalyFlags.push("device_clock_skew");
  if (input.capturedOffline && ageMilliseconds > 24 * 60 * 60 * 1000) anomalyFlags.push("delayed_sync_over_24h");
  const attendanceStatus = anomalyFlags.length ? "needs_review" : "recorded";
  const photoStatus = policy.photoRequired ? "pending_upload" : "not_required";
  const syncStatus = policy.photoRequired ? "syncing" : "synced";
  const insert = {
    client_event_id: input.clientEventId,
    employee_id: identity.employeeId,
    account_id: identity.accountId,
    event_type: eventType,
    attendance_date: attendanceDate,
    effective_at: effectiveAt.toISOString(),
    captured_at_client: capturedAt.toISOString(),
    received_at_server: serverNow.toISOString(),
    synced_at: policy.photoRequired ? null : serverNow.toISOString(),
    location_id: match.location?.id ?? null,
    latitude: input.location?.latitude ?? null,
    longitude: input.location?.longitude ?? null,
    accuracy_meters: input.location?.accuracy ?? null,
    distance_meters: match.distanceMeters ?? null,
    geofence_status: match.status,
    attendance_status: attendanceStatus,
    photo_status: photoStatus,
    sync_status: syncStatus,
    captured_offline: input.capturedOffline,
    device_metadata: input.deviceMetadata,
    anomaly_flags: anomalyFlags
  };
  const { data, error } = await client.from("attendance_events").insert(insert).select(eventSelect).single();
  if (error) {
    const { data: concurrentReplay } = await client
      .from("attendance_events").select(eventSelect).eq("client_event_id", input.clientEventId).maybeSingle();
    if (concurrentReplay) return { event: mapEvent(concurrentReplay as Row), idempotentReplay: true };
    if (error.code === "23505") throw new AppError("DUPLICATE", "Lượt chấm công tương ứng đã tồn tại.");
    throw new AppError("SERVER_ERROR", "Không thể ghi nhận lượt chấm công.");
  }
  const event = mapEvent(data as Row);
  await Promise.all([
    client.from("attendance_sync_events").insert({ attendance_event_id: event.id, state: syncStatus, retry_count: 0 }),
    recordAuditLog({
      actorId: identity.accountId,
      action: "attendance.created",
      entityType: "attendance_event",
      entityId: event.id,
      after: { eventType, attendanceStatus, photoStatus, syncStatus },
      metadata: { source: "SELF_MOBILE_WEB", capturedOffline: input.capturedOffline }
    })
  ]);
  return { event, idempotentReplay: false };
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isWebp(bytes: Uint8Array): boolean {
  return bytes.length > 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
}

async function validatePhoto(file: File): Promise<"jpg" | "webp"> {
  if (file.size <= 0 || file.size > 2 * 1024 * 1024) throw new AppError("PHOTO_UPLOAD", "Ảnh phải nhỏ hơn 2 MB.");
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (file.type === "image/jpeg" && isJpeg(bytes)) return "jpg";
  if (file.type === "image/webp" && isWebp(bytes)) return "webp";
  throw new AppError("PHOTO_UPLOAD", "Ảnh phải là JPEG hoặc WebP hợp lệ.");
}

export async function uploadAttendancePhoto(
  user: AuthenticatedUser,
  eventId: string,
  input: { photo: File; thumbnail: File; width: number; height: number; capturedAt: string }
): Promise<AttendanceRecordResult> {
  const client = clientOrThrow();
  const identity = await resolveIdentity(client, user);
  const { data: eventRow, error: eventError } = await client
    .from("attendance_events").select(eventSelect).eq("id", eventId).eq("employee_id", identity.employeeId).maybeSingle();
  if (eventError || !eventRow) throw new AppError("NOT_FOUND", "Không tìm thấy lượt chấm công.");
  const { data: existingPhoto } = await client.from("attendance_photos").select("id").eq("attendance_event_id", eventId).maybeSingle();
  if (existingPhoto) return { event: mapEvent(eventRow as Row), idempotentReplay: true };

  const [extension] = await Promise.all([validatePhoto(input.photo), validatePhoto(input.thumbnail)]);
  if (!Number.isInteger(input.width) || !Number.isInteger(input.height) || input.width < 1 || input.height < 1 || input.width > 10000 || input.height > 10000) {
    throw new AppError("PHOTO_UPLOAD", "Kích thước ảnh không hợp lệ.");
  }
  const photoId = crypto.randomUUID();
  const date = new Date(input.capturedAt);
  const prefix = `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${identity.employeeId}/${photoId}`;
  const photoPath = `${prefix}.${extension}`;
  const thumbnailPath = `${prefix}-thumb.${extension}`;
  await client.from("attendance_events").update({ photo_status: "uploading" }).eq("id", eventId);

  const uploadedPaths: string[] = [];
  try {
    for (const [path, file] of [[photoPath, input.photo], [thumbnailPath, input.thumbnail]] as const) {
      const { error } = await client.storage.from("attendance-photos").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new AppError("PHOTO_UPLOAD", "Chưa thể tải ảnh lên. Dữ liệu vẫn được giữ trên thiết bị.");
      uploadedPaths.push(path);
    }
    const fullAssetId = crypto.randomUUID();
    const thumbnailAssetId = crypto.randomUUID();
    const { error: assetError } = await client.from("file_assets").insert([
      { id: fullAssetId, bucket: "attendance-photos", object_path: photoPath, owner_entity_type: "attendance_event", owner_entity_id: eventId, mime_type: input.photo.type, byte_size: input.photo.size, visibility: "private", created_by: identity.accountId, metadata: { derivative: "full" } },
      { id: thumbnailAssetId, bucket: "attendance-photos", object_path: thumbnailPath, owner_entity_type: "attendance_event", owner_entity_id: eventId, mime_type: input.thumbnail.type, byte_size: input.thumbnail.size, visibility: "private", created_by: identity.accountId, metadata: { derivative: "thumbnail" } }
    ]);
    if (assetError) throw new AppError("PHOTO_UPLOAD", "Không thể lưu thông tin ảnh.");
    const { error: photoError } = await client.from("attendance_photos").insert({
      id: photoId,
      attendance_event_id: eventId,
      file_id: fullAssetId,
      thumbnail_file_id: thumbnailAssetId,
      captured_at: input.capturedAt,
      width: input.width,
      height: input.height,
      metadata: { normalizedOrientation: true, source: "camera" }
    });
    if (photoError) throw new AppError("PHOTO_UPLOAD", "Không thể liên kết ảnh chấm công.");
    const { data: completed, error: updateError } = await client
      .from("attendance_events")
      .update({ photo_status: "uploaded", sync_status: "synced", synced_at: new Date().toISOString() })
      .eq("id", eventId).select(eventSelect).single();
    if (updateError || !completed) throw new AppError("PHOTO_UPLOAD", "Không thể hoàn tất đồng bộ ảnh.");
    await Promise.all([
      client.from("attendance_sync_events").insert({ attendance_event_id: eventId, state: "synced", category: "photo_uploaded" }),
      recordAuditLog({ actorId: identity.accountId, action: "attendance.photo_linked", entityType: "attendance_event", entityId: eventId, metadata: { photoId } })
    ]);
    return { event: mapEvent(completed as Row), idempotentReplay: false };
  } catch (error) {
    await client.from("attendance_events").update({ photo_status: "upload_failed", sync_status: "sync_failed" }).eq("id", eventId);
    await client.from("attendance_sync_events").insert({ attendance_event_id: eventId, state: "sync_failed", category: "photo_upload" });
    if (uploadedPaths.length > 0) await client.storage.from("attendance-photos").remove(uploadedPaths);
    await recordAuditLog({ actorId: identity.accountId, action: "attendance.photo_upload_failed", entityType: "attendance_event", entityId: eventId });
    throw error;
  }
}

export async function listAttendanceHistory(user: AuthenticatedUser, from?: string, to?: string): Promise<AttendanceHistoryDay[]> {
  const client = clientOrThrow();
  const identity = await resolveIdentity(client, user);
  const events = await readEvents(client, { employeeId: identity.employeeId, from, to, limit: 180 });
  const grouped = new Map<string, AttendanceEvent[]>();
  for (const event of events) grouped.set(event.attendanceDate, [...(grouped.get(event.attendanceDate) ?? []), event]);
  const policy = await readPolicy(client);
  return [...grouped.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, dayEvents]) => {
    const checkIn = dayEvents.find((event) => event.eventType === "check_in");
    const checkOut = dayEvents.find((event) => event.eventType === "check_out");
    const isPending = dayEvents.some((event) => event.syncStatus !== "synced");
    const start = checkIn ? new Date(checkIn.effectiveAt) : undefined;
    const shiftStart = new Date(`${date}T${policy.shiftStart}:00+07:00`);
    const late = start ? start.getTime() > shiftStart.getTime() + policy.lateThresholdMinutes * 60_000 : false;
    return { date, checkIn, checkOut, status: isPending ? "pending" : !checkOut ? "missing_check_out" : late ? "late" : "complete" };
  });
}

export async function listAttendanceRecords(user: AuthenticatedUser, filters: { from?: string; to?: string; employeeId?: string; locationId?: string; status?: string; photo?: string }): Promise<AttendanceEvent[]> {
  if (!can(user.permissions, "attendance.view_all") && !can(user.permissions, "attendance.view_team")) throw new AppError("PERMISSION_DENIED");
  const client = clientOrThrow();
  let query = client.from("attendance_events").select(eventSelect).order("effective_at", { ascending: false }).limit(300);
  if (filters.from) query = query.gte("attendance_date", filters.from);
  if (filters.to) query = query.lte("attendance_date", filters.to);
  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.locationId) query = query.eq("location_id", filters.locationId);
  if (filters.status) query = query.eq("attendance_status", filters.status);
  if (filters.photo === "missing") query = query.eq("photo_status", "not_required");
  if (filters.photo === "pending") query = query.in("photo_status", ["pending_upload", "uploading", "upload_failed"]);
  if (filters.photo === "uploaded") query = query.eq("photo_status", "uploaded");
  const { data, error } = await query;
  if (error) throw new AppError("SERVER_ERROR", "Không thể đọc danh sách chấm công.");
  return (data ?? []).map((row) => mapEvent(row as Row));
}

export async function getAttendanceEvent(user: AuthenticatedUser, eventId: string): Promise<AttendanceEvent> {
  const client = clientOrThrow();
  const identity = await resolveIdentity(client, user);
  const { data, error } = await client.from("attendance_events").select(eventSelect).eq("id", eventId).maybeSingle();
  if (error || !data) throw new AppError("NOT_FOUND", "Không tìm thấy lượt chấm công.");
  const event = mapEvent(data as Row);
  if (event.employeeId !== identity.employeeId && !can(user.permissions, "attendance.view_all") && !can(user.permissions, "attendance.view_team")) {
    throw new AppError("PERMISSION_DENIED");
  }
  return event;
}

export async function getAttendancePhotoAsset(user: AuthenticatedUser, photoId: string, thumbnail: boolean): Promise<{ bucket: string; path: string }> {
  if (!can(user.permissions, "attendance.view_photo") && !can(user.permissions, "attendance.self.view")) throw new AppError("PERMISSION_DENIED");
  const client = clientOrThrow();
  const identity = await resolveIdentity(client, user);
  const { data, error } = await client
    .from("attendance_photos")
    .select("id,attendance_events(employee_id),file_assets!attendance_photos_file_id_fkey(bucket,object_path),thumbnail:file_assets!attendance_photos_thumbnail_file_id_fkey(bucket,object_path)")
    .eq("id", photoId).maybeSingle();
  if (error || !data) throw new AppError("NOT_FOUND", "Không tìm thấy ảnh chấm công.");
  const event = data.attendance_events as unknown as Row;
  if (String(event.employee_id) !== identity.employeeId && !can(user.permissions, "attendance.view_photo")) throw new AppError("PERMISSION_DENIED");
  const asset = (thumbnail ? data.thumbnail : data.file_assets) as unknown as Row | null;
  if (!asset) throw new AppError("NOT_FOUND", "Ảnh chưa đồng bộ.");
  return { bucket: requiredString(asset, "bucket"), path: requiredString(asset, "object_path") };
}

export async function getAttendanceConfiguration(user: AuthenticatedUser) {
  if (!can(user.permissions, "attendance.config.view") && !can(user.permissions, "attendance.config.manage")) throw new AppError("PERMISSION_DENIED");
  const client = clientOrThrow();
  const [policy, locations] = await Promise.all([readPolicy(client), readLocations(client)]);
  return { policy, locations };
}

export async function updateAttendancePolicy(user: AuthenticatedUser, patch: Omit<AttendancePolicy, "id" | "name" | "timezone">): Promise<AttendancePolicy> {
  if (!can(user.permissions, "attendance.config.manage")) throw new AppError("PERMISSION_DENIED");
  const client = clientOrThrow();
  const identity = await resolveIdentity(client, user);
  const current = await readPolicy(client);
  const { data, error } = await client.from("attendance_policies").update({
    attendance_enabled: patch.attendanceEnabled,
    photo_required: patch.photoRequired,
    gps_required: patch.gpsRequired,
    offline_enabled: patch.offlineEnabled,
    allowed_accuracy_threshold_meters: patch.allowedAccuracyThresholdMeters,
    early_checkin_window_minutes: patch.earlyCheckinWindowMinutes,
    late_threshold_minutes: patch.lateThresholdMinutes,
    shift_name: patch.shiftName,
    shift_start: patch.shiftStart,
    shift_end: patch.shiftEnd,
    updated_by: identity.accountId
  }).eq("id", current.id).select("*").single();
  if (error || !data) throw new AppError("SERVER_ERROR", "Không thể lưu chính sách chấm công.");
  await recordAuditLog({ actorId: identity.accountId, action: "attendance.policy_updated", entityType: "attendance_policy", entityId: current.id });
  return mapPolicy(data as Row);
}

export async function saveAttendanceLocation(user: AuthenticatedUser, input: Omit<AttendanceLocation, "id"> & { id?: string }): Promise<AttendanceLocation> {
  if (!can(user.permissions, "attendance.config.manage")) throw new AppError("PERMISSION_DENIED");
  const client = clientOrThrow();
  const identity = await resolveIdentity(client, user);
  const values = { name: input.name, latitude: input.latitude, longitude: input.longitude, radius_meters: input.radiusMeters, active: input.active };
  const operation = input.id
    ? client.from("attendance_locations").update(values).eq("id", input.id)
    : client.from("attendance_locations").insert({ ...values, created_by: identity.accountId });
  const { data, error } = await operation.select("*").single();
  if (error || !data) throw new AppError("SERVER_ERROR", "Không thể lưu địa điểm chấm công.");
  const location = mapLocation(data as Row);
  await recordAuditLog({ actorId: identity.accountId, action: "attendance.location_saved", entityType: "attendance_location", entityId: location.id });
  return location;
}
