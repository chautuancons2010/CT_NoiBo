import { workerWorkIntervals } from "./workerWorkIntervals";
import { accountWorkTime } from "@/features/timesheets/services/workTimeAccounting";
import { usesWorkforceAttendancePolicy } from "@/features/timesheets/services/workforceAttendancePolicy";
import type { WorkerAttendanceSession, WorkerWorkEvent } from "../types/workerAttendanceTypes";
export interface WorkerObservation {
  workEvents?: WorkerWorkEvent[];
  session?: WorkerAttendanceSession;
  status: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  dayException?: string;
  sessionId?: string;
  observedAt?: string;
  breakMinutes?: number;
}

/** Rounds are evidence of attendance. Overlapping intervals count once per day. */
export function aggregateWorkerDay<T extends WorkerObservation>(observations: T[]) {
  if (!observations.length) return undefined;
  const ordered = [...observations].sort((a, b) => (a.observedAt ?? a.checkedInAt ?? "").localeCompare(b.observedAt ?? b.checkedInAt ?? "") || (a.sessionId ?? "").localeCompare(b.sessionId ?? ""));
  const present = ordered.filter(item => item.status === "present" || item.status === "late");
  const source = present.at(-1) ?? ordered.at(-1)!;
  const intervals = present.flatMap(item => {
    if (item.workEvents?.length) return workerWorkIntervals(item).map(interval => [Date.parse(interval.checkedInAt),Date.parse(interval.checkedOutAt)]);
    const start = Date.parse(item.checkedInAt ?? ""), end = Date.parse(item.checkedOutAt ?? "");
    return Number.isFinite(start) && Number.isFinite(end) && end >= start ? [[start, end]] : [];
  }).sort((a, b) => a[0] - b[0]);
  const merged: number[][] = [];
  for (const [start, end] of intervals) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  const missingCheckIn = present.some(item => !Number.isFinite(Date.parse(item.checkedInAt ?? "")));
  const missingCheckOut = present.some(item => {
    const start = Date.parse(item.checkedInAt ?? ""), end = Date.parse(item.checkedOutAt ?? "");
    return !Number.isFinite(end) || Number.isFinite(start) && end < start;
  });
  const complete = present.length > 0 && !missingCheckIn && !missingCheckOut;
  const validTimes = (values: Array<string | undefined>) => values.filter((value): value is string => Boolean(value) && Number.isFinite(Date.parse(value!))).sort((a, b) => Date.parse(a) - Date.parse(b));
  const starts = validTimes(present.map(item => item.checkedInAt));
  const ends = validTimes(present.map(item => item.checkedOutAt));
  const presenceMinutes = merged.reduce((total, [start, end]) => total + Math.floor((end - start) / 60000), 0);
  let breakMinutes = Math.min(presenceMinutes, Math.max(0, ...present.map(item => item.workEvents?.length ? 0 : item.breakMinutes ?? 0)));
  const schedule = present.find(item => item.session?.shiftStart && item.session.shiftEnd && (item.session.shiftScheduleRules || usesWorkforceAttendancePolicy(item.session.date)))?.session;
  const accounting = schedule?.shiftStart && schedule.shiftEnd ? accountWorkTime({date:schedule.date,shift:{startTime:schedule.shiftStart,endTime:schedule.shiftEnd,crossMidnight:schedule.shiftEnd<=schedule.shiftStart,scheduleRules:schedule.shiftScheduleRules,breakMinutes:schedule.shiftBreakMinutes},workingDay:present.some(item=>item.session?.sessionType!=="overtime")||schedule.overtimeDayType!=="rest_day"&&schedule.overtimeDayType!=="holiday",intervals:merged.map(([start,end])=>({checkedInAt:new Date(start).toISOString(),checkedOutAt:new Date(end).toISOString()})),confirmedOvertime:present.filter(item=>item.session?.sessionType==="overtime"&&item.session.overtimeStatus==="confirmed").flatMap(workerWorkIntervals),recordedOvertime:present.filter(item=>item.session?.sessionType==="overtime").flatMap(workerWorkIntervals),pendingOvertime:present.filter(item=>item.session?.sessionType==="overtime"&&item.session.overtimeStatus==="pending").flatMap(workerWorkIntervals)}) : undefined;
  if(accounting)breakMinutes=Math.max(0,presenceMinutes-accounting.regularMinutes-accounting.outsideMinutes);
  return {
    ...source,
    checkedInAt: starts[0], checkedOutAt: missingCheckOut ? undefined : ends.at(-1),
    sessionIds: ordered.map(item => item.sessionId).filter((value): value is string => Boolean(value)),
    mergedIntervals: merged.map(([start, end]) => ({ checkedInAt: new Date(start).toISOString(), checkedOutAt: new Date(end).toISOString() })),
    observations: ordered.map(({ status, checkedInAt, checkedOutAt, dayException, sessionId, observedAt, breakMinutes }) => ({ status, checkedInAt, checkedOutAt, dayException, sessionId, observedAt, breakMinutes })),
    complete, missingCheckIn, missingCheckOut, presenceMinutes, breakMinutes, workMinutes: accounting?.creditedMinutes ?? presenceMinutes - breakMinutes,
    overtimeMinutes:accounting?.overtimeMinutes??0,pendingOvertimeMinutes:accounting?.pendingOvertimeMinutes??0,
    workFraction: accounting ? Math.min(1,accounting.creditedMinutes/480) : present.length ? Math.max(...present.map(item => item.dayException === "half_day" ? .5 : 1)) : 0
  };
}
