import { describe, expect, it } from "vitest";

import { distanceInMeters, getNextAttendanceAction, getAttendanceSequenceWarning, summarizeAttendanceIntervals, matchAttendanceLocation, retryDelayMilliseconds } from "./attendanceRules";
import type { AttendancePolicy } from "@/features/attendance/types/attendanceTypes";

const policy: AttendancePolicy = {
  id: "policy",
  name: "Mặc định",
  attendanceEnabled: true,
  photoRequired: true,
  gpsRequired: true,
  offlineEnabled: true,
  allowedAccuracyThresholdMeters: 100,
  earlyCheckinWindowMinutes: 60,
  lateThresholdMinutes: 5,
  shiftName: "Ca hành chính",
  shiftStart: "08:00",
  shiftEnd: "17:00",
  timezone: "Asia/Ho_Chi_Minh"
};

describe("attendance rules", () => {
  it("matches the nearest valid location", () => {
    const result = matchAttendanceLocation(
      { latitude: 10.7769, longitude: 106.7009, accuracy: 12, capturedAt: new Date().toISOString() },
      [{ id: "office", name: "Văn phòng", latitude: 10.7769, longitude: 106.7009, radiusMeters: 100, active: true }],
      policy
    );
    expect(result.status).toBe("valid");
    expect(result.location?.id).toBe("office");
    expect(result.distanceMeters).toBeLessThan(1);
  });

  it("marks an inaccurate reading for review", () => {
    expect(matchAttendanceLocation(
      { latitude: 10, longitude: 106, accuracy: 150, capturedAt: new Date().toISOString() },
      [],
      policy
    ).status).toBe("accuracy_low");
  });

  it("accepts GPS anywhere without enforcing the location radius", () => {
    const result = matchAttendanceLocation(
      { latitude: 21.0278, longitude: 105.8342, accuracy: 20, capturedAt: new Date().toISOString() },
      [{ id: "office", name: "Văn phòng", latitude: 10.7769, longitude: 106.7009, radiusMeters: 10, active: true }],
      policy
    );
    expect(result.status).toBe("valid");
    expect(result.distanceMeters).toBeGreaterThan(1_000_000);
  });

  it("accepts real coordinates with no configured attendance locations", () => {
    expect(matchAttendanceLocation({ latitude: 0, longitude: 0, accuracy: 12, capturedAt: new Date().toISOString() }, [], policy)).toEqual({ status: "valid" });
  });

  it("requires coordinates only when the GPS policy requires them", () => {
    expect(matchAttendanceLocation(undefined, [], policy).status).toBe("unavailable");
    expect(matchAttendanceLocation(undefined, [], { ...policy, gpsRequired: false }).status).toBe("not_required");
    expect(matchAttendanceLocation({ latitude: 10, longitude: 106, accuracy: 20, capturedAt: new Date().toISOString() }, [], { ...policy, gpsRequired: false }).status).toBe("valid");
  });

  it("follows check-in then check-out state", () => {
    expect(getNextAttendanceAction([])).toBe("check_in");
    expect(getNextAttendanceAction([{ eventType: "check_in" }])).toBe("check_out");
    expect(getNextAttendanceAction([{ eventType: "check_in" }, { eventType: "check_out" }])).toBe("check_in");
    expect(getNextAttendanceAction([{ eventType: "check_in" }, { eventType: "check_out" }, { eventType: "check_in" }])).toBe("check_out");
  });

  it("warns about repeated actions without replacing the requested action", () => {
    expect(getAttendanceSequenceWarning([{ eventType: "check_in" }], "check_in")).toContain("thêm lần nữa");
    expect(getAttendanceSequenceWarning([{ eventType: "check_out" }], "check_out")).toContain("thêm lần nữa");
    expect(getAttendanceSequenceWarning([], "check_out")).toContain("chưa có lượt chấm vào");
    expect(getAttendanceSequenceWarning([{ eventType: "check_in" }], "check_out")).toBeUndefined();
  });

  it("sums working intervals and never counts the gap or duplicate taps twice", () => {
    const event = (eventType: "check_in" | "check_out", clock: string) => ({ eventType, effectiveAt: `2026-11-09T${clock}:00+07:00`, attendanceStatus: "recorded" as const });
    const summary = summarizeAttendanceIntervals([event("check_in", "08:00"), event("check_in", "08:01"), event("check_out", "12:00"), event("check_out", "12:01"), event("check_in", "13:00"), event("check_out", "17:00")]);
    expect(summary).toMatchObject({ workMinutes: 480, intervals: 2, hasOpenCheckIn: false });
    expect(getNextAttendanceAction([event("check_out", "17:00"), event("check_in", "13:00")])).toBe("check_in");
  });

  it("caps exponential retry delay", () => {
    expect(retryDelayMilliseconds(0)).toBe(1_000);
    expect(retryDelayMilliseconds(20)).toBe(60_000);
  });

  it("computes a realistic distance", () => {
    expect(distanceInMeters(
      { latitude: 10.7769, longitude: 106.7009 },
      { latitude: 10.7779, longitude: 106.7009 }
    )).toBeGreaterThan(100);
  });
});
