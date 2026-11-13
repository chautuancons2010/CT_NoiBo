import type { ShiftScheduleRules } from "../types/timesheetTypes";

export const portSchedulePresets = [
  { code: "PORT_SPECIALIZED", name: "Cảng chuyên dụng", startTime: "08:00", endTime: "17:00", breakMinutes: 90 },
  { code: "PORT_GENERAL", name: "Cảng tổng hợp", startTime: "07:30", endTime: "17:00", breakMinutes: 90 }
] as const;
export const portScheduleRules: ShiftScheduleRules = { breakStartTime: "11:30", breakEndTime: "13:00", arrivalLeadMinutes: 10 };
export const portScheduleEffectiveFrom = "2026-11-13";

export function readScheduleRules(value: unknown): ShiftScheduleRules | undefined {
  if (!value || typeof value !== "object") return undefined;
  const rules = value as Record<string, unknown>;
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (typeof rules.breakStartTime !== "string" || typeof rules.breakEndTime !== "string" || !time.test(rules.breakStartTime) || !time.test(rules.breakEndTime) || !Number.isInteger(rules.arrivalLeadMinutes) || Number(rules.arrivalLeadMinutes) < 0 || Number(rules.arrivalLeadMinutes) > 120) return undefined;
  return { breakStartTime: rules.breakStartTime, breakEndTime: rules.breakEndTime, arrivalLeadMinutes: Number(rules.arrivalLeadMinutes) };
}

export function clockMinutes(value: string) {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}
export function requiredArrivalTime(startTime: string, leadMinutes = 10) {
  const value = (clockMinutes(startTime) - leadMinutes + 1440) % 1440;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
