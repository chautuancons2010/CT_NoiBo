import { describe, expect, it } from "vitest";
import { assignmentRangesOverlap, countWorkerAttendance, validateSessionForSubmit } from "./workerAttendanceRules";
import type { WorkerAttendanceEntry } from "@/features/worker-attendance/types/workerAttendanceTypes";

const entry = (status: WorkerAttendanceEntry["status"], isUnplanned = false): WorkerAttendanceEntry => ({ id: crypto.randomUUID(), sessionId: "s", workerId: crypto.randomUUID(), employeeCode: "CN", workerName: "Công nhân", assignmentRole: "worker", status, dayException: "none", isUnplanned });

describe("worker attendance rules", () => {
  it("counts roster states without duplicating photos by worker", () => {
    expect(countWorkerAttendance([entry("present"), entry("absent"), entry("present", true)])).toMatchObject({ total: 3, present: 2, absent: 1, unplanned: 1 });
  });
  it("blocks submit with unconfirmed workers or missing photos", () => {
    const errors = validateSessionForSubmit({ entries: [entry("unconfirmed")], photoCount: 0, geofenceStatus: "valid" }, { minimumPhotos: 1, workNoteRequired: false, endOfDayRequired: false, offlineEnabled: true, editWindowMinutes: 120 });
    expect(errors).toHaveLength(2);
  });
  it("detects overlapping effective assignments", () => {
    expect(assignmentRangesOverlap({ startDate: "2026-09-01", endDate: "2026-09-30", shiftStart: "07:00", shiftEnd: "17:00" }, { startDate: "2026-09-10", endDate: "2026-09-12", shiftStart: "08:00", shiftEnd: "12:00" })).toBe(true);
  });
});
