import type { WorkerAttendanceEntry } from "../types/workerAttendanceTypes";
import type { WorkInterval } from "@/features/timesheets/services/workTimeAccounting";

export function workerWorkState(entry: WorkerAttendanceEntry): "working" | "paused" | "finished" | "unconfirmed" {
  const last = [...(entry.workEvents ?? [])].sort((a,b) => Date.parse(a.effectiveAt) - Date.parse(b.effectiveAt)).at(-1);
  if (entry.checkedOutAt || last?.eventType === "finish") return "finished";
  if (last?.eventType === "pause") return "paused";
  return entry.checkedInAt || last ? "working" : "unconfirmed";
}

export function workerWorkIntervals(entry: Pick<WorkerAttendanceEntry, "checkedInAt" | "checkedOutAt" | "workEvents">): WorkInterval[] {
  const events = [...(entry.workEvents ?? [])].sort((a,b) => Date.parse(a.effectiveAt) - Date.parse(b.effectiveAt));
  const result: WorkInterval[] = [];
  let opened = entry.checkedInAt;
  for (const event of events) {
    if (event.eventType === "start" || event.eventType === "resume") opened ??= event.effectiveAt;
    else if (opened && Date.parse(event.effectiveAt) >= Date.parse(opened)) {
      result.push({ checkedInAt: opened, checkedOutAt: event.effectiveAt });
      opened = undefined;
    }
  }
  if (opened && entry.checkedOutAt && Date.parse(entry.checkedOutAt) >= Date.parse(opened)) result.push({ checkedInAt: opened, checkedOutAt: entry.checkedOutAt });
  return result;
}

export function workerRainIntervals(entry: Pick<WorkerAttendanceEntry,"checkedOutAt"|"workEvents">): WorkInterval[] {
  const result: WorkInterval[] = [];
  let paused: string | undefined;
  for (const event of [...(entry.workEvents ?? [])].sort((a,b) => Date.parse(a.effectiveAt)-Date.parse(b.effectiveAt))) {
    if (event.eventType === "pause" && event.reason === "rain") paused = event.effectiveAt;
    else if (paused && (event.eventType === "resume" || event.eventType === "finish")) { result.push({checkedInAt:paused,checkedOutAt:event.effectiveAt}); paused = undefined; }
  }
  if (paused && entry.checkedOutAt) result.push({checkedInAt:paused,checkedOutAt:entry.checkedOutAt});
  return result;
}
