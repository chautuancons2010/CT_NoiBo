import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/lib/auth/permissions";

const getSupabaseServiceClient = vi.hoisted(() => vi.fn());
const getProject = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServiceClient }));
vi.mock("@/features/projects/services/projectRepository", () => ({ getProject, getProjectRoster: vi.fn(async () => []) }));
vi.mock("@/services/audit/auditLog", () => ({ recordAuditLog: vi.fn() }));
vi.mock("@/features/shared-platforms/services/notificationRepository", () => ({ publishNotificationEvent: vi.fn() }));

import { createWorkerSession, saveWorkerSessionDraft, submitWorkerSession } from "./workerAttendanceRepository";

const user: AuthenticatedUser = { id: "11111111-1111-4111-8111-111111111111", username: "test.supervisor", email: "supervisor@example.com", displayName: "Giám sát", status: "active", permissions: ["worker_attendance.create", "worker_attendance.view_all"] };
const sessionRow = { id: "session-1", client_session_id: "capture-1", project_id: "project-1", project_name_snapshot: "Dự án", worksite_id: "site-1", worksite_name_snapshot: "Công trường", attendance_date: "2026-10-05", shift_code: "DAY", shift_name_snapshot: "Ca ngày", session_type: "morning", supervisor_employee_id: "employee-1", supervisor_name_snapshot: "Giám sát", started_at: "2026-10-05T01:00:00Z", captured_at_client: "2026-10-05T01:00:00Z", geofence_status: "outside", latitude: 21.0278, longitude: 105.8342, accuracy_meters: 20, status: "in_progress", sync_status: "synced", photo_status: "uploaded", version: 1, worker_attendance_entries: [], worker_attendance_photos: [], worker_attendance_adjustments: [], checklist_snapshot: [], checklist_responses: [] };

function database({ existing = true, referenceCoordinates = true } = {}) {
  let saved: Record<string, unknown> | undefined = existing ? { ...sessionRow } : undefined;
  const mutations: Record<string, unknown>[] = [];
  const client = {
    from(table: string) {
      let clientReplay = false;
      const query = {
        select: () => query, limit: () => query, order: () => query,
        eq: (column: string) => { if (column === "client_session_id") clientReplay = true; return query; },
        insert: (values: Record<string, unknown>) => { if (table === "worker_attendance_sessions") { mutations.push(values); saved = { ...sessionRow, ...values }; } return query; },
        update: (values: Record<string, unknown>) => { mutations.push(values); saved = { ...saved, ...values }; return query; },
        single: async () => ({ data: table === "worksites" ? { latitude: referenceCoordinates ? 10.7769 : null, longitude: referenceCoordinates ? 106.7009 : null, allowed_accuracy_threshold_meters: 100 } : { id: "session-1" }, error: null }),
        maybeSingle: async () => ({ data: table === "app_accounts" ? { id: user.id, employee_id: "employee-1", status: "active", employees: { full_name: "Giám sát" } } : table === "worker_attendance_policies" ? { minimum_photos: 0, work_note_required: false, end_of_day_required: false, offline_enabled: true, edit_window_minutes: 120 } : table === "worker_attendance_sessions" ? clientReplay ? null : saved : null, error: null }),
        then(onFulfilled: (value: unknown) => unknown) { return Promise.resolve({ data: [], error: null }).then(onFulfilled); }
      };
      return query;
    }
  };
  getSupabaseServiceClient.mockReturnValue(client);
  return mutations;
}

beforeEach(() => {
  getSupabaseServiceClient.mockReset();
  getProject.mockResolvedValue({ id: "project-1", name: "Dự án", status: "active", worksites: [{ id: "site-1", name: "Công trường", status: "active", gpsRequired: true, allowedAccuracyThresholdMeters: 100, radiusMeters: 10 }] });
});

describe("worker attendance GPS evidence", () => {
  it.each([true, false])("accepts captured GPS regardless of reference radius or missing site coordinates (%s)", async (referenceCoordinates) => {
    const writes = database({ existing: false, referenceCoordinates });
    const result = await createWorkerSession(user, { clientSessionId: "capture-1", projectId: "project-1", worksiteId: "site-1", date: "2026-10-05", shiftCode: "DAY", sessionType: "morning", capturedAtClient: "2026-10-05T01:00:00Z", location: { latitude: 21.0278, longitude: 105.8342, accuracy: 20 } });
    expect(result.session).toMatchObject({ geofenceStatus: "valid", latitude: 21.0278, longitude: 105.8342 });
    expect(writes[0]).toMatchObject({ latitude: 21.0278, longitude: 105.8342, geofence_status: "valid" });
  });

  it("updates GPS status after retry in a previously outside session and retains low precision as evidence", async () => {
    const writes = database();
    const result = await saveWorkerSessionDraft(user, "session-1", { version: 1, entries: [], checklistResponses: [], location: { latitude: 21.0278, longitude: 105.8342, accuracy: 20000 } });
    expect(result).toMatchObject({ geofenceStatus: "accuracy_low", accuracyMeters: 20000 });
    expect(writes[0]).toMatchObject({ geofence_status: "accuracy_low", accuracy_meters: 20000 });
  });

  it("submits a historical outside-radius session with real GPS", async () => {
    const writes = database();
    await expect(submitWorkerSession(user, "session-1", 1)).resolves.toMatchObject({ status: "submitted", latitude: 21.0278 });
    expect(writes[0]).toMatchObject({ status: "submitted" });
  });
});
