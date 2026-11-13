import type { Shift, TimesheetEventInput } from "../types/timesheetTypes";
import { requiredArrivalTime } from "./portSchedules";
import { arrivalLeadMinutesForDate, creditedWorkMinutes } from "./workforceAttendancePolicy";

export interface WorkInterval { checkedInAt: string; checkedOutAt: string; }
type Interval = [number, number];
const minute = 60_000;

function merge(intervals: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const [start, end] of intervals.filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a).sort((a, b) => a[0] - b[0])) {
    const previous = result.at(-1);
    if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end);
    else result.push([start, end]);
  }
  return result;
}
function overlap(first: Interval[], second: Interval[]) {
  return merge(first.flatMap(([start, end]) => second.map(([a, b]): Interval => [Math.max(start, a), Math.min(end, b)])));
}
function subtract(first: Interval[], second: Interval[]): Interval[] {
  let result = merge(first);
  for (const [cutStart,cutEnd] of merge(second)) result = result.flatMap(([start,end]): Interval[] => cutEnd <= start || cutStart >= end ? [[start,end]] : [[start,Math.min(end,cutStart)],[Math.max(start,cutEnd),end]].filter(([a,b])=>b>a) as Interval[]);
  return result;
}
const duration = (intervals: Interval[]) => Math.floor(intervals.reduce((sum, [start, end]) => sum + end - start, 0) / minute);
const parse = (intervals: readonly WorkInterval[]) => merge(intervals.map(item => [Date.parse(item.checkedInAt), Date.parse(item.checkedOutAt)]));

export function pairAttendanceEvents(events: readonly TimesheetEventInput[]): WorkInterval[] {
  const result: WorkInterval[] = [];
  let opened: string | undefined;
  for (const event of [...events].sort((a, b) => Date.parse(a.effectiveAt) - Date.parse(b.effectiveAt))) {
    if (event.eventType === "check_in") opened ??= event.effectiveAt;
    else if (opened && Date.parse(event.effectiveAt) > Date.parse(opened)) { result.push({ checkedInAt: opened, checkedOutAt: event.effectiveAt }); opened = undefined; }
  }
  return result;
}

export function accountWorkTime(input: { date: string; shift?: Pick<Shift,"startTime"|"endTime"|"crossMidnight"|"scheduleRules"> & Partial<Pick<Shift,"breakMinutes">>; workingDay: boolean; intervals: readonly WorkInterval[]; confirmedOvertime?: readonly WorkInterval[]; pendingOvertime?: readonly WorkInterval[]; recordedOvertime?: readonly WorkInterval[] }) {
  const actual = parse(input.intervals);
  const at = (time: string) => Date.parse(`${input.date}T${time}:00+07:00`);
  const shift = input.shift;
  let scheduled: Interval[] = [];
  let breakWindow: Interval[] = [];
  if (input.workingDay && shift) {
    const start = at(shift.startTime), end = at(shift.endTime) + (shift.crossMidnight || shift.endTime <= shift.startTime ? 86_400_000 : 0);
    if (shift.scheduleRules) {
      const breakStart = at(shift.scheduleRules.breakStartTime), breakEnd = at(shift.scheduleRules.breakEndTime);
      scheduled = [[start, breakStart], [breakEnd, end]];
      breakWindow = [[breakStart, breakEnd]];
    } else scheduled = [[start, end]];
  }
  const confirmed = overlap(actual, parse(input.confirmedOvertime ?? []));
  const pending = subtract(overlap(actual, parse(input.pendingOvertime ?? [])), confirmed);
  const declaredOvertime = merge([...confirmed, ...pending, ...parse(input.recordedOvertime ?? [])]);
  const regularPresence = subtract(actual, declaredOvertime);
  const withinShift = duration(overlap(regularPresence, scheduled));
  const fallbackBreak = shift && !shift.scheduleRules && actual.length === 1 ? Math.min(withinShift, shift.breakMinutes ?? 0) : 0;
  const actualRegularMinutes = Math.max(0, withinShift - fallbackBreak);
  const regularMinutes = actualRegularMinutes;
  const scheduledMinutes = Math.max(0, duration(scheduled) - (shift && !shift.scheduleRules ? shift.breakMinutes ?? 0 : 0));
  const creditedMinutes = creditedWorkMinutes(input.date, regularMinutes, scheduledMinutes);
  const breakMinutes = duration(overlap(actual, breakWindow)) + fallbackBreak;
  let outsideMinutes = Math.max(0, duration(actual) - actualRegularMinutes - breakMinutes);
  // Explicit overtime can be before, during or after the configured shift.
  // Its minutes are removed from regular work so a minute is credited once.
  const overtimeMinutes = duration(confirmed);
  const leadMinutes = arrivalLeadMinutesForDate(input.date, shift?.scheduleRules?.arrivalLeadMinutes);
  const arrivalDeadline = shift ? at(shift.startTime) - leadMinutes * minute : undefined;
  const arrivalLateMinutes = arrivalDeadline !== undefined && regularMinutes > 0 && regularPresence.length ? Math.max(0, Math.ceil((regularPresence[0][0] - arrivalDeadline) / minute)) : 0;
  const pendingOvertimeMinutes = duration(pending);
  outsideMinutes = Math.max(outsideMinutes,overtimeMinutes+pendingOvertimeMinutes);
  return { regularMinutes, creditedMinutes, outsideMinutes, overtimeMinutes, pendingOvertimeMinutes, arrivalLateMinutes, requiredArrivalTime: shift ? requiredArrivalTime(shift.startTime, leadMinutes) : undefined };
}
