import type { WorkerAttendanceSession } from "../types/workerAttendanceTypes";

export function workerRainEvidence(session: WorkerAttendanceSession) {
  const groups = new Map<string, { batchId: string; effectiveAt: string; workers: Set<string>; evidencePending: boolean }>();
  for (const entry of session.entries) for (const event of entry.workEvents ?? []) {
    if (event.reason !== "rain" || !["pause", "finish"].includes(event.eventType)) continue;
    const key = event.batchId ?? event.id;
    const group = groups.get(key) ?? { batchId: key, effectiveAt: event.effectiveAt, workers: new Set<string>(), evidencePending: Boolean(event.evidencePending) };
    group.workers.add(entry.workerId); groups.set(key, group);
  }
  return [...groups.values()].sort((a,b) => Date.parse(a.effectiveAt)-Date.parse(b.effectiveAt)).map(group => ({ ...group, photos: session.photos.filter(photo => photo.purpose === "rain_pause" && photo.workBatchId === group.batchId) }));
}
