import type { WorkerAttendanceEntry, WorkerAttendanceSession } from "../types/workerAttendanceTypes";

export function workerClock(entry: WorkerAttendanceEntry, session: Pick<WorkerAttendanceSession, "shiftBreakMinutes">) {
  const start = entry.checkedInAt ? Date.parse(entry.checkedInAt) : NaN;
  const end = entry.checkedOutAt ? Date.parse(entry.checkedOutAt) : NaN;
  const complete = Number.isFinite(start) && Number.isFinite(end) && end >= start;
  const presenceMinutes = complete ? Math.floor((end - start) / 60000) : undefined;
  const breakMinutes = complete ? Math.min(presenceMinutes!, Math.max(0, session.shiftBreakMinutes ?? 0)) : undefined;
  return { complete, presenceMinutes, breakMinutes, workMinutes: complete ? presenceMinutes! - breakMinutes! : undefined };
}

export function workerClockLabel(value?: string) {
  return value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" }).format(new Date(value)) : "";
}
