export interface WorkerObservation {
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
  const breakMinutes = Math.min(presenceMinutes, Math.max(0, ...present.map(item => item.breakMinutes ?? 0)));
  return {
    ...source,
    checkedInAt: starts[0], checkedOutAt: missingCheckOut ? undefined : ends.at(-1),
    sessionIds: ordered.map(item => item.sessionId).filter((value): value is string => Boolean(value)),
    mergedIntervals: merged.map(([start, end]) => ({ checkedInAt: new Date(start).toISOString(), checkedOutAt: new Date(end).toISOString() })),
    observations: ordered.map(({ status, checkedInAt, checkedOutAt, dayException, sessionId, observedAt, breakMinutes }) => ({ status, checkedInAt, checkedOutAt, dayException, sessionId, observedAt, breakMinutes })),
    complete, missingCheckIn, missingCheckOut, presenceMinutes, breakMinutes, workMinutes: presenceMinutes - breakMinutes,
    workFraction: present.length ? Math.max(...present.map(item => item.dayException === "half_day" ? .5 : 1)) : 0
  };
}
