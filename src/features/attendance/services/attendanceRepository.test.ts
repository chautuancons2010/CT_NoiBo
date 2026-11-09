import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

const getSupabaseServiceClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServiceClient }));
vi.mock("@/services/audit/auditLog", () => ({ recordAuditLog: vi.fn() }));

import { getAttendanceAdminToday, getAttendanceDashboard, getAttendancePhotoAsset, recordAttendance } from "./attendanceRepository";

const user: AuthenticatedUser = { id: "11111111-1111-4111-8111-111111111111", displayName: "Nhân viên", username: "employee", email: "employee@example.com", status: "active", permissions: ["attendance.self.view"] };
const policy = {
  id: "policy-1", name: "Ca ngày", attendance_enabled: true, photo_required: true,
  gps_required: true, offline_enabled: true, allowed_accuracy_threshold_meters: 100,
  early_checkin_window_minutes: 30, late_threshold_minutes: 5,
  shift_name: "Ca ngày", shift_start: "08:00:00", shift_end: "17:00:00", timezone: "Asia/Ho_Chi_Minh"
};
const account = { id: user.id, employee_id: "employee-1", status: "active", employees: { full_name: "Nhân viên", employee_code: "NV01" } };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function mockDatabase(accountResult: Promise<{ data: typeof account | null; error: null }>, policyResult: Promise<{ data: typeof policy; error: null }>) {
  const tables: string[] = [];
  getSupabaseServiceClient.mockReturnValue({
    from(table: string) {
      tables.push(table);
      const response = table === "app_accounts" ? accountResult : table === "attendance_policies" ? policyResult : Promise.resolve({ data: [], error: null });
      const query = {
        select: () => query,
        eq: () => query,
        lte: () => query,
        or: () => query,
        limit: () => query,
        order: () => query,
        range: () => response,
        maybeSingle: () => response,
        single: () => response,
        then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
          return response.then(onFulfilled, onRejected);
        }
      };
      return query;
    }
  });
  return tables;
}

beforeEach(() => getSupabaseServiceClient.mockReset());

describe("attendance dashboard reads", () => {
  it("starts policy and identity reads together, then returns the complete attendance model", async () => {
    const identityRead = deferred<{ data: typeof account; error: null }>();
    const policyRead = deferred<{ data: typeof policy; error: null }>();
    const tables = mockDatabase(identityRead.promise, policyRead.promise);

    const dashboard = getAttendanceDashboard(user);
    expect(tables).toEqual(["app_accounts", "attendance_policies"]);

    identityRead.resolve({ data: account, error: null });
    policyRead.resolve({ data: policy, error: null });
    await expect(dashboard).resolves.toMatchObject({ employeeId: "employee-1", employeeCode: "NV01", nextAction: "check_in", locations: [], todayEvents: [], policy: { photoRequired: true, gpsRequired: true, shiftStart: "08:00" } });
    expect(tables).toContain("employee_attendance_locations");
    expect(tables).toContain("attendance_events");
  });

  it("keeps an inactive employee account blocked and never loads its attendance data", async () => {
    const tables = mockDatabase(Promise.resolve({ data: { ...account, status: "disabled" }, error: null }), Promise.resolve({ data: policy, error: null }));

    await expect(getAttendanceDashboard(user)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    expect(tables).toEqual(["app_accounts", "attendance_policies"]);
  });
});

const office = { id: "office-1", name: "Văn phòng", latitude: 10.7769, longitude: 106.7009, radius_meters: 10, active: true };

function mockAttendanceData(events: Record<string, unknown>[] = []) {
  const inserts: Record<string, unknown>[] = [];
  getSupabaseServiceClient.mockReturnValue({
    from(table: string) {
      let values: Record<string, unknown> | undefined;
      const rows = table === "attendance_events" ? events : table === "employees" ? [{ id: "employee-1", employee_code: "NV01", full_name: "Nhân viên", department_id: "department-1" }] : table === "departments" ? [{ id: "department-1", name: "Nhân sự" }] : table === "attendance_locations" ? [office] : [];
      const response = { data: rows, error: null };
      const query = {
        select: () => query, eq: () => query, in: () => query, lte: () => query,
        gte: () => query, or: () => query, order: () => query, limit: () => query,
        range: () => Promise.resolve(response),
        insert: (input: Record<string, unknown>) => { values = input; if (table === "attendance_events") inserts.push(input); return query; },
        single: () => Promise.resolve({ data: values ? { ...values, id: "event-1", attendance_photos: [] } : null, error: null }),
        maybeSingle: () => Promise.resolve({ data: table === "app_accounts" ? account : table === "attendance_policies" ? policy : null, error: null }),
        then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) { return Promise.resolve(response).then(onFulfilled, onRejected); }
      };
      return query;
    }
  });
  return inserts;
}

describe("attendance GPS evidence", () => {
  it("records a new requested check-in even after check-in and check-out already exist", async () => {
    const now = new Date();
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    const existing = (id: string, eventType: string, ago: number) => ({ id, employee_id: "employee-1", client_event_id: id, event_type: eventType, attendance_date: date, effective_at: new Date(now.getTime() - ago).toISOString(), captured_at_client: new Date(now.getTime() - ago).toISOString(), received_at_server: now.toISOString(), geofence_status: "valid", attendance_status: "recorded", photo_status: "uploaded", sync_status: "synced", attendance_photos: [] });
    const inserts = mockAttendanceData([existing("earlier-in", "check_in", 2000), existing("earlier-out", "check_out", 1000)]);
    const result = await recordAttendance(user, { clientEventId: "third-operation", intendedType: "check_in", capturedAtClient: now.toISOString(), capturedOffline: false, location: { latitude: 10.7769, longitude: 106.7009, accuracy: 8, capturedAt: now.toISOString() }, deviceMetadata: {} });
    expect(result.event.eventType).toBe("check_in");
    expect(inserts).toHaveLength(1);
  });

  it("keeps an explicit repeated check-in and marks it for HR review", async () => {
    const now = new Date().toISOString();
    mockAttendanceData([{ id: "previous-in", employee_id: "employee-1", client_event_id: "previous-in", event_type: "check_in", attendance_date: now.slice(0,10), effective_at: now, captured_at_client: now, received_at_server: now, geofence_status: "valid", attendance_status: "recorded", photo_status: "uploaded", sync_status: "synced", attendance_photos: [] }]);
    const result = await recordAttendance(user, { clientEventId: "repeat-operation", intendedType: "check_in", capturedAtClient: now, capturedOffline: false, location: { latitude: 10.7769, longitude: 106.7009, accuracy: 8, capturedAt: now }, deviceMetadata: {} });
    expect(result.event).toMatchObject({ eventType: "check_in", attendanceStatus: "needs_review", anomalyFlags: ["repeated_check_in"] });
  });

  it("records real GPS far outside the configured reference radius", async () => {
    const inserts = mockAttendanceData();
    const now = new Date().toISOString();
    const result = await recordAttendance(user, { clientEventId: "capture-1", capturedAtClient: now, capturedOffline: false, location: { latitude: 21.0278, longitude: 105.8342, accuracy: 20, capturedAt: now }, deviceMetadata: {} });

    expect(result.event).toMatchObject({ latitude: 21.0278, longitude: 105.8342, geofenceStatus: "valid", attendanceStatus: "recorded" });
    expect(inserts[0]).toMatchObject({ latitude: 21.0278, longitude: 105.8342, accuracy_meters: 20 });
    expect(inserts[0].distance_meters).toBeGreaterThan(1_000_000);
  });

  it("records low accuracy coordinates for HR review instead of rejecting them", async () => {
    const inserts = mockAttendanceData();
    const now = new Date().toISOString();
    const result = await recordAttendance(user, { clientEventId: "capture-2", capturedAtClient: now, capturedOffline: false, location: { latitude: 10.7769, longitude: 106.7009, accuracy: 20000, capturedAt: now }, deviceMetadata: {} });

    expect(result.event).toMatchObject({ geofenceStatus: "accuracy_low", attendanceStatus: "needs_review", anomalyFlags: ["gps_accuracy_low"] });
    expect(inserts[0].accuracy_meters).toBe(20000);
  });

  it("retains attendance without GPS for HR review with an explicit anomaly", async () => {
    const inserts = mockAttendanceData();
    const result = await recordAttendance(user, { clientEventId: "capture-3", capturedAtClient: new Date().toISOString(), capturedOffline: false, deviceMetadata: {} });
    expect(result.event).toMatchObject({ geofenceStatus: "unavailable", attendanceStatus: "needs_review", anomalyFlags: ["gps_unavailable"] });
    expect(inserts).toHaveLength(1);
  });
});

describe("HR daily evidence", () => {
  it("returns every event and photo with GPS while rejected events do not affect worked time", async () => {
    const date = "2026-10-01";
    const makeEvent = (id: string, eventType: string, clock: string, attendanceStatus = "recorded") => ({ id, employee_id: "employee-1", client_event_id: id, event_type: eventType, attendance_date: date, effective_at: `${date}T${clock}:00+07:00`, captured_at_client: `${date}T${clock}:00+07:00`, received_at_server: `${date}T${clock}:00+07:00`, geofence_status: "valid", attendance_status: attendanceStatus, photo_status: "uploaded", sync_status: "synced", latitude: 10.7769, longitude: 106.7009, accuracy_meters: 12, attendance_photos: [{ id: `photo-${id}` }] });
    mockAttendanceData([makeEvent("rejected-in", "check_in", "07:00", "rejected"), makeEvent("in", "check_in", "08:00"), makeEvent("out", "check_out", "17:00")]);

    const result = await getAttendanceAdminToday({ ...user, permissions: ["attendance.view_all", "attendance.view_photo"] }, date);
    expect(result).toMatchObject({ date, canViewPhotos: true, totalEmployees: 1 });
    expect(result.rows[0]).toMatchObject({ checkIn: `${date}T08:00:00+07:00`, checkOut: `${date}T17:00:00+07:00`, totalMinutes: 540 });
    expect(result.rows[0].events).toHaveLength(3);
    expect(result.rows[0].events?.[0]).toMatchObject({ photoId: "photo-rejected-in", latitude: 10.7769, longitude: 106.7009, attendanceStatus: "rejected" });
  });

  it("does not grant photo visibility through daily attendance access alone", async () => {
    mockAttendanceData();
    await expect(getAttendanceAdminToday({ ...user, permissions: ["attendance.view_all"] }, "2026-10-01")).resolves.toMatchObject({ canViewPhotos: false });
    await expect(getAttendanceAdminToday(user, "2026-10-01")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });
});

describe("attendance photo reads", () => {
  it("falls back to the original when an uploaded photo has no thumbnail", async () => {
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { evidence_status: "available", attendance_events: { employee_id: "employee-1" }, thumbnail: null, file_assets: { bucket: "attendance-photos", object_path: "original.webp" } }, error: null }) };
    getSupabaseServiceClient.mockReturnValue({ from: () => query });

    await expect(getAttendancePhotoAsset({ ...user, permissions: ["attendance.photo.view"] }, "photo-1", true)).resolves.toEqual({ bucket: "attendance-photos", path: "original.webp" });
    await expect(getAttendancePhotoAsset({ ...user, permissions: ["attendance.view_photo"] }, "photo-1", false)).resolves.toEqual({ bucket: "attendance-photos", path: "original.webp" });
  });

  it("keeps expired evidence and unprivileged accounts blocked", async () => {
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { evidence_status: "expired" }, error: null }) };
    getSupabaseServiceClient.mockReturnValue({ from: () => query });
    await expect(getAttendancePhotoAsset({ ...user, permissions: ["attendance.view_photo"] }, "photo-1", true)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getAttendancePhotoAsset({ ...user, permissions: [] }, "photo-1", true)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });
});
