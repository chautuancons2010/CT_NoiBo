import { describe, expect, it } from "vitest";

import { distanceInMeters, getNextAttendanceAction, matchAttendanceLocation, retryDelayMilliseconds } from "./attendanceRules";
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

  it("does not accept an inaccurate reading", () => {
    expect(matchAttendanceLocation(
      { latitude: 10, longitude: 106, accuracy: 150, capturedAt: new Date().toISOString() },
      [],
      policy
    ).status).toBe("accuracy_low");
  });

  it("follows check-in then check-out state", () => {
    expect(getNextAttendanceAction([])).toBe("check_in");
    expect(getNextAttendanceAction([{ eventType: "check_in" }])).toBe("check_out");
    expect(getNextAttendanceAction([{ eventType: "check_in" }, { eventType: "check_out" }])).toBe("completed");
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
