"use client";

import { deleteWorkerDraft, getWorkerDraft, saveWorkerDraft, type WorkerLocalDraft } from "./workerDraftStore";
import type { WorkerAttendanceSession } from "@/features/worker-attendance/types/workerAttendanceTypes";

interface ApiBody<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export class WorkerSyncError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

export async function readWorkerResponse<T>(response: Response): Promise<T> {
  const body = await response.json() as ApiBody<T>;
  if (!response.ok || !body.ok || body.data === undefined) {
    throw new WorkerSyncError(body.error?.code ?? "NETWORK_ERROR", body.error?.message ?? "Chưa thể đồng bộ.");
  }
  return body.data;
}

export async function fetchWorkerSession(id: string): Promise<WorkerAttendanceSession> {
  return readWorkerResponse<WorkerAttendanceSession>(await workerFetch(`/api/v1/worker-attendance/sessions/${id}`, { cache: "no-store" }));
}

function workerFetch(url: string, options: RequestInit = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
}

// A background save and an explicit submission must never update one version
// concurrently. Each caller keeps its own snapshot and runs after the prior save.
const pendingWrites = new Map<string, Promise<WorkerAttendanceSession>>();
export function syncWorkerDraft(draft: WorkerLocalDraft): Promise<WorkerAttendanceSession> {
  const key = draft.clientSessionId;
  const prior = pendingWrites.get(key);
  const pending = (prior ? prior.catch(() => undefined) : Promise.resolve(undefined)).then(async previous => {
    const stored = await getWorkerDraft(draft.id);
    const latest = stored && stored.updatedAt > draft.updatedAt && !draft.pendingSubmit ? stored : draft;
    const value = previous && previous.version > latest.session.version ? { ...latest, session: { ...latest.session, id: previous.id, version: previous.version, entries: previous.entries.map(entry => ({ ...entry, ...latest.session.entries.find(local => local.workerId === entry.workerId), id: entry.id, sessionId: previous.id })) } } : latest;
    return syncWorkerDraftUnlocked(value);
  });
  pendingWrites.set(key, pending);
  void pending.finally(() => { if (pendingWrites.get(key) === pending) pendingWrites.delete(key); }).catch(() => undefined);
  return pending;
}

async function syncWorkerDraftUnlocked(draft: WorkerLocalDraft): Promise<WorkerAttendanceSession> {
  const syncing = { ...draft, retryCount: draft.retryCount + 1 };
  await saveWorkerDraft(syncing);
  let session = syncing.session;

  try {
    if (session.id.startsWith("local-")) {
      const created = await readWorkerResponse<{ session: WorkerAttendanceSession }>(await workerFetch("/api/v1/worker-attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSessionId: syncing.clientSessionId,
          projectId: session.projectId,
          worksiteId: session.worksiteId,
          date: session.date,
          shiftCode: session.shiftCode,
          sessionType: session.sessionType,
          capturedAtClient: session.capturedAtClient,
          location: syncing.location
        })
      }));
      session = created.session;
      if (session.submittedAt || session.status === "submitted" || session.status === "locked") {
        if (session.clientSessionId !== syncing.clientSessionId) throw new WorkerSyncError("CONFLICT", "Gói này đã được gửi chấm công. Hãy mở lại phiên để kiểm tra.");
        await deleteWorkerDraft(draft.id);
        return session;
      }
      const serverWorkerIds = new Set(session.entries.map(entry => entry.workerId));
      if (syncing.session.selectionMode && syncing.session.entries.some(entry => entry.isSelected && !serverWorkerIds.has(entry.workerId))) {
        throw new WorkerSyncError("CONFLICT", "Danh sách công nhân trong gói đã thay đổi. Hãy chọn lại công nhân.");
      }
    }

    const localByWorker = new Map(syncing.session.entries.map((entry) => [entry.workerId, entry]));
    const entries = session.entries.map((entry) => {
      const local = localByWorker.get(entry.workerId);
      return {
        id: entry.id,
        status: local?.status ?? entry.status,
        isSelected: local?.isSelected ?? entry.isSelected,
        exceptionReason: local?.exceptionReason ?? null,
        dayException: local?.dayException ?? "none",
        exceptionTime: local?.exceptionTime ?? null,
        note: local?.note ?? null
      };
    });
    const patch = () => workerFetch(`/api/v1/worker-attendance/sessions/${session.id}/draft`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: session.version, entries, workNote: syncing.session.workNote ?? null, note: syncing.session.note ?? null, safetyConfirmed: syncing.session.safetyConfirmed, safetyReport: syncing.session.safetyReport, checklistResponses: syncing.session.checklistResponses, location: syncing.location })
    });
    session = await readWorkerResponse<WorkerAttendanceSession>(await patch());

    for (const localPhoto of syncing.photos.filter((photo) => !photo.uploaded)) {
      const form = new FormData();
      form.set("photo", localPhoto.photo, "worker-attendance.jpg");
      form.set("thumbnail", localPhoto.thumbnail, "worker-attendance-thumbnail.jpg");
      form.set("photoId", localPhoto.id);
      form.set("width", String(localPhoto.width));
      form.set("height", String(localPhoto.height));
      form.set("capturedAt", localPhoto.capturedAt);
      if (localPhoto.address) form.set("address", localPhoto.address);
      if (localPhoto.latitude !== undefined) form.set("latitude", String(localPhoto.latitude));
      if (localPhoto.longitude !== undefined) form.set("longitude", String(localPhoto.longitude));
      if (localPhoto.accuracy !== undefined) form.set("accuracy", String(localPhoto.accuracy));
      session = await readWorkerResponse<WorkerAttendanceSession>(await workerFetch(`/api/v1/worker-attendance/sessions/${session.id}/photos`, { method: "POST", body: form }));
      localPhoto.uploaded = true;
    }

    if (syncing.pendingSubmit) {
      session = await readWorkerResponse<WorkerAttendanceSession>(await workerFetch(`/api/v1/worker-attendance/sessions/${session.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: session.version })
      }));
    }

    const latest = await getWorkerDraft(draft.id);
    const hasNewEdits = latest && latest.updatedAt > draft.updatedAt && !syncing.pendingSubmit;
    const latestByWorker = new Map(latest?.session.entries.map(entry => [entry.workerId, entry]));
    const merged = hasNewEdits ? { ...session, entries: session.entries.map(entry => ({ ...entry, ...latestByWorker.get(entry.workerId), id: entry.id, sessionId: session.id, checkedInAt: entry.checkedInAt, checkedOutAt: entry.checkedOutAt })), checklistResponses: latest.session.checklistResponses, safetyConfirmed: latest.session.safetyConfirmed, safetyReport: latest.session.safetyReport, workNote: latest.session.workNote } : session;
    if (draft.id !== session.id || session.status === "submitted" || session.status === "locked") await deleteWorkerDraft(draft.id);
    if (session.status !== "submitted" && session.status !== "locked") {
      await saveWorkerDraft({ ...(hasNewEdits ? latest : syncing), id: session.id, session: merged, photos: hasNewEdits ? latest.photos.filter(photo => !photo.uploaded && !session.photos.some(saved => saved.id === photo.id)) : [], retryCount: 0, updatedAt: hasNewEdits ? latest.updatedAt : draft.updatedAt });
    }
    return session;
  } catch (error) {
    const latest = await getWorkerDraft(draft.id);
    const recover = latest && latest.updatedAt > draft.updatedAt ? latest : syncing;
    const localByWorker = new Map(recover.session.entries.map(entry => [entry.workerId, entry]));
    await saveWorkerDraft({ ...recover, pendingSubmit: error instanceof WorkerSyncError && error.code !== "NETWORK_ERROR" ? false : recover.pendingSubmit, session: {
      ...session,
      entries: session.entries.map(entry => ({ ...entry, ...localByWorker.get(entry.workerId), id: entry.id, sessionId: session.id })),
      safetyConfirmed: recover.session.safetyConfirmed,
      safetyReport: recover.session.safetyReport,
      workNote: recover.session.workNote,
      note: recover.session.note,
      checklistResponses: recover.session.checklistResponses,
      syncStatus: "sync_failed"
    } });
    throw error;
  }
}
