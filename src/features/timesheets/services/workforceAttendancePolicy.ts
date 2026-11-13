// New rules apply to work dates from the owner's instruction, not locked history.
export const workforceAttendanceEffectiveFrom = "2026-11-12";
export const requiredArrivalLeadMinutes = 10;
export const normalWorkdayMinutes = 8 * 60;
export const usesWorkforceAttendancePolicy = (date: string) => date >= workforceAttendanceEffectiveFrom;

export function arrivalLeadMinutesForDate(date: string, previous = 0) {
  return usesWorkforceAttendancePolicy(date) ? requiredArrivalLeadMinutes : previous;
}

export function arrivalLatenessMinutes(date: string, checkedInAt: string, shiftStart: string) {
  const deadline = Date.parse(`${date}T${shiftStart.slice(0, 5)}:00+07:00`) - requiredArrivalLeadMinutes * 60_000;
  return Math.max(0, Math.ceil((Date.parse(checkedInAt) - deadline) / 60_000));
}

/** Preserve real minutes separately; a complete scheduled day earns eight hours. */
export function creditedWorkMinutes(date: string, actualMinutes: number, scheduledMinutes: number) {
  if (!usesWorkforceAttendancePolicy(date)) return actualMinutes;
  const basis = Math.min(normalWorkdayMinutes, Math.max(1, scheduledMinutes));
  return Math.min(normalWorkdayMinutes, Math.max(0, Math.round(actualMinutes / basis * normalWorkdayMinutes)));
}
