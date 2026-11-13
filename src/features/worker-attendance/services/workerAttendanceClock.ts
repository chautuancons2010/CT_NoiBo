import type { WorkerAttendanceEntry, WorkerAttendanceSession } from "../types/workerAttendanceTypes";
import { workerWorkIntervals } from "./workerWorkIntervals";
import { accountWorkTime } from "@/features/timesheets/services/workTimeAccounting";
import { arrivalLatenessMinutes, usesWorkforceAttendancePolicy } from "@/features/timesheets/services/workforceAttendancePolicy";

export function recordWorkerSelection(entry: WorkerAttendanceEntry, patch: Partial<WorkerAttendanceEntry>, session: Pick<WorkerAttendanceSession, "date" | "shiftStart" | "sessionType">, observedAt = new Date().toISOString()): WorkerAttendanceEntry {
  const next = { ...entry, ...patch };
  if (next.isSelected === false || !["present", "late"].includes(next.status)) return { ...next, checkedInAt: undefined, checkedOutAt: undefined };
  const checkedInAt = entry.isSelected !== false && ["present", "late"].includes(entry.status) && entry.checkedInAt ? entry.checkedInAt : observedAt;
  const late = session.sessionType !== "overtime" && session.shiftStart && usesWorkforceAttendancePolicy(session.date) && arrivalLatenessMinutes(session.date, checkedInAt, session.shiftStart) > 0;
  return { ...next, checkedInAt, status: late ? "late" : next.status };
}

export function workerClock(entry: WorkerAttendanceEntry, session: Pick<WorkerAttendanceSession, "shiftBreakMinutes"> & Partial<Pick<WorkerAttendanceSession,"date"|"shiftStart"|"shiftEnd"|"shiftScheduleRules"|"sessionType"|"overtimeDayType">>) {
  const scheduled = session.date && session.shiftStart && session.shiftEnd && (session.shiftScheduleRules || usesWorkforceAttendancePolicy(session.date));
  if (scheduled || entry.workEvents?.length) {
    const intervals = workerWorkIntervals(entry);
    const presenceMinutes = intervals.reduce((sum,item) => sum + Math.max(0,Math.floor((Date.parse(item.checkedOutAt)-Date.parse(item.checkedInAt))/60000)),0);
    if (scheduled && session.date && session.shiftStart && session.shiftEnd) {
      const time = accountWorkTime({ date: session.date, shift: { startTime: session.shiftStart, endTime: session.shiftEnd, crossMidnight: session.shiftEnd <= session.shiftStart, scheduleRules: session.shiftScheduleRules, breakMinutes: session.shiftBreakMinutes }, workingDay: session.overtimeDayType !== "rest_day" && session.overtimeDayType !== "holiday", intervals, confirmedOvertime: session.sessionType === "overtime" ? intervals : [] });
      return { complete: Boolean(entry.checkedOutAt), presenceMinutes, breakMinutes: Math.max(0,presenceMinutes-time.regularMinutes-time.outsideMinutes), workMinutes: session.sessionType === "overtime" ? time.overtimeMinutes : time.creditedMinutes };
    }
    return { complete: Boolean(entry.checkedOutAt), presenceMinutes, breakMinutes: 0, workMinutes: presenceMinutes };
  }
  const start = entry.checkedInAt ? Date.parse(entry.checkedInAt) : NaN;
  const end = entry.checkedOutAt ? Date.parse(entry.checkedOutAt) : NaN;
  const complete = Number.isFinite(start) && Number.isFinite(end) && end >= start;
  const presenceMinutes = complete ? Math.floor((end - start) / 60000) : undefined;
  const breakMinutes = complete ? Math.min(presenceMinutes!, Math.max(0, session.shiftBreakMinutes ?? 0)) : undefined;
  return { complete, presenceMinutes, breakMinutes, workMinutes: complete ? presenceMinutes! - breakMinutes! : undefined };
}

export function workerClockLabel(value?: string, date?: string) {
  if (!value) return "";
  if (date) {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year:"numeric", month:"2-digit",day:"2-digit" }).format(new Date(value));
    return `${new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", timeStyle: "short" }).format(new Date(value))}${day !== date ? " (+1 ngày)" : ""}`;
  }
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}
