import type { AttendanceDashboard } from "../types/attendanceTypes";
import { getBusinessDateKey } from "@/lib/time/timezone";

// Only reuse the current account's current-day view while the fresh request runs.
let snapshot: { value: AttendanceDashboard; at: number; date: string } | undefined;
export function rememberAttendanceDashboard(value: AttendanceDashboard) {
  snapshot = { value, at: Date.now(), date: getBusinessDateKey() };
}
export function cachedAttendanceDashboard(accountId: string) {
  return snapshot?.value.accountId === accountId && snapshot.date === getBusinessDateKey() && Date.now() - snapshot.at < 60_000 ? snapshot.value : undefined;
}
