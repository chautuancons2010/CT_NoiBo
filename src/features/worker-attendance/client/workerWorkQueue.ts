"use client";
import type { WorkerAttendanceEntry, WorkerAttendanceSession } from "../types/workerAttendanceTypes";
import { readWorkerResponse } from "./workerAttendanceSync";
import { deleteWorkEvidence, getWorkEvidence } from "./workerDraftStore";

export interface WorkerWorkOperation { ownerAccountId: string; batchId: string; sessionId: string; entryIds: string[]; eventType: "pause" | "resume" | "finish"; effectiveAt: string; reason: string; evidenceRequired?: boolean; evidencePhotoIds?: string[]; evidenceOnly?: boolean; }
const key = (accountId: string) => `ct:worker-work-queue:v1:${accountId}`;
export function readWorkerWorkQueue(accountId: string): WorkerWorkOperation[] {
  const raw = window.localStorage.getItem(key(accountId));
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Không thể đọc thao tác đang chờ trên thiết bị.");
  return parsed;
}
export function writeWorkerWorkQueue(accountId: string, operations: WorkerWorkOperation[]) {
  window.localStorage.setItem(key(accountId), JSON.stringify(operations));
  window.dispatchEvent(new Event("worker-work-queue-changed"));
}
const syncing = new Map<string, Promise<void>>();
export function syncWorkerWorkQueue(accountId: string): Promise<void> {
  const active = syncing.get(accountId);
  if (active) return active;
  const task = (async () => {
    if (!navigator.onLine) return;
    for (const operation of readWorkerWorkQueue(accountId)) {
      if (operation.ownerAccountId !== accountId) throw new Error("Thao tác chờ thuộc tài khoản khác.");
      const { sessionId, evidenceOnly, ...body } = operation;
      if (operation.evidencePhotoIds?.length) {
        const evidence = await getWorkEvidence(operation.batchId);
        if (!evidence || evidence.ownerAccountId !== accountId || evidence.sessionId !== sessionId || operation.evidencePhotoIds.some(id => !evidence.photos.some(photo => photo.id === id))) throw new Error("Chưa đọc được ảnh minh chứng đã lưu trên thiết bị.");
        for (const photo of evidence.photos) {
          const form = new FormData();
          form.set("photo", photo.photo, "rain.jpg"); form.set("thumbnail", photo.thumbnail, "rain-thumbnail.jpg");
          form.set("photoId", photo.id); form.set("width", String(photo.width)); form.set("height", String(photo.height)); form.set("capturedAt", photo.capturedAt);
          form.set("purpose", "rain_pause"); form.set("workBatchId", operation.batchId);
          if (photo.address) form.set("address", photo.address);
          if (photo.latitude !== undefined) form.set("latitude", String(photo.latitude));
          if (photo.longitude !== undefined) form.set("longitude", String(photo.longitude));
          if (photo.accuracy !== undefined) form.set("accuracy", String(photo.accuracy));
          await readWorkerResponse(await fetch(`/api/v1/worker-attendance/sessions/${sessionId}/photos`, { method: "POST", body: form, signal: AbortSignal.timeout(20_000) }));
        }
      }
      const session = await readWorkerResponse<WorkerAttendanceSession>(await fetch(`/api/v1/worker-attendance/sessions/${sessionId}${evidenceOnly ? "" : "/work-events"}`, evidenceOnly ? { cache: "no-store", signal: AbortSignal.timeout(20_000) } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20_000) }));
      writeWorkerWorkQueue(accountId, readWorkerWorkQueue(accountId).filter(item => item.batchId !== operation.batchId));
      if (operation.evidencePhotoIds?.length) await deleteWorkEvidence(operation.batchId).catch(() => undefined);
      window.dispatchEvent(new CustomEvent("worker-work-synced", { detail: { accountId, session } }));
    }
  })().finally(() => { syncing.delete(accountId); });
  syncing.set(accountId, task);
  return task;
}
export function withPendingWorkOperations(session: WorkerAttendanceSession, operations: WorkerWorkOperation[]): WorkerAttendanceSession {
  const pending = operations.filter(operation => operation.sessionId === session.id);
  const entries = session.entries.map(entry => {
    let updated: WorkerAttendanceEntry = entry;
    for (const operation of pending.filter(operation => operation.entryIds.includes(entry.id))) {
      if (operation.evidenceOnly) {
        updated = { ...updated, workEvents: updated.workEvents?.map(event => event.batchId === operation.batchId ? { ...event, evidencePending: true } : event) };
        continue;
      }
      const id = `pending-${operation.batchId}-${entry.id}`;
      if (updated.workEvents?.some(event => event.id === id || event.batchId === operation.batchId && event.eventType === operation.eventType)) continue;
      updated = { ...updated, checkedOutAt: operation.eventType === "finish" ? operation.effectiveAt : updated.checkedOutAt, workEvents: [...(updated.workEvents ?? []), { id, batchId: operation.batchId, evidencePending: Boolean(operation.evidencePhotoIds?.length), entryId: entry.id, eventType: operation.eventType, effectiveAt: operation.effectiveAt, reason: operation.reason }] };
    }
    return updated;
  });
  return entries.some((entry,index) => entry !== session.entries[index]) ? { ...session, entries } : session;
}
