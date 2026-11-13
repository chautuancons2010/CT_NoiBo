"use client";

import type { WorkerAttendancePolicy, WorkerAttendanceSession, WorkerAttendanceTask } from "@/features/worker-attendance/types/workerAttendanceTypes";
import { decodeDurableImage, encodeDurableImage } from "@/features/attendance/client/durableImage";

async function encodePhoto(photo: LocalWorkerPhoto) {
  return { ...photo, photo: await encodeDurableImage(photo.photo), thumbnail: await encodeDurableImage(photo.thumbnail), rawPhoto: photo.rawPhoto ? await encodeDurableImage(photo.rawPhoto) : undefined };
}
function decodePhoto(photo: LocalWorkerPhoto): LocalWorkerPhoto {
  return { ...photo, photo: decodeDurableImage(photo.photo), thumbnail: decodeDurableImage(photo.thumbnail), rawPhoto: photo.rawPhoto ? decodeDurableImage(photo.rawPhoto) : undefined };
}

export interface LocalWorkerPhoto {
  purpose?: "rain_pause";
  workBatchId?: string;
  capturedByName?: string;
  capturedByUsername?: string;
  checkpoint?: import("../types/workerAttendanceTypes").OvertimeCheckpoint;
  rawPhoto?: Blob;
  address?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  id: string;
  photo: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
  capturedAt: string;
  uploaded: boolean;
}

export interface WorkerLocalDraft {
  id: string;
  ownerAccountId: string;
  clientSessionId: string;
  session: WorkerAttendanceSession;
  location?: { latitude: number; longitude: number; accuracy: number };
  photos: LocalWorkerPhoto[];
  pendingSubmit: boolean;
  retryCount: number;
  updatedAt: string;
}

export interface CachedWorkerTasks {
  personalAttendanceReady?: boolean;
  key: string;
  accountId: string;
  date: string;
  tasks: WorkerAttendanceTask[];
  policy: WorkerAttendancePolicy;
  cachedAt: string;
}

const DATABASE = "chau-tuan-worker-attendance";
const VERSION = 2;
const DRAFTS = "drafts";
const TASKS = "tasks";
const WORK_EVIDENCE = "work-evidence";

export interface WorkerWorkEvidence {
  batchId: string;
  ownerAccountId: string;
  sessionId: string;
  photos: LocalWorkerPhoto[];
  draft?: { eventType: "pause" | "finish"; entryIds: string[]; effectiveAt: string; reason: string; evidenceOnly?: boolean };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DRAFTS)) database.createObjectStore(DRAFTS, { keyPath: "id" });
      if (!database.objectStoreNames.contains(TASKS)) database.createObjectStore(TASKS, { keyPath: "key" });
      if (!database.objectStoreNames.contains(WORK_EVIDENCE)) database.createObjectStore(WORK_EVIDENCE, { keyPath: "batchId" });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function transact<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    let result: T;
    transaction.oncomplete = () => { database.close(); resolve(result); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Không thể lưu bản nháp.")); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
    action(transaction.objectStore(storeName), (value) => { result = value; }, reject);
  });
}

export async function saveWorkerDraft(draft: WorkerLocalDraft): Promise<void> {
  const stored = { ...draft, photos: await Promise.all(draft.photos.map(encodePhoto)) };
  return transact(DRAFTS, "readwrite", (store, resolve, reject) => { const request = store.put(stored); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
}

export function getWorkerDraft(id: string): Promise<WorkerLocalDraft | undefined> {
  return transact<WorkerLocalDraft | undefined>(DRAFTS, "readonly", (store, resolve, reject) => { const request = store.get(id); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }).then(draft => draft ? { ...draft, photos: draft.photos.map(decodePhoto) } : undefined);
}

export async function saveWorkEvidence(evidence: WorkerWorkEvidence): Promise<void> {
  const stored = { ...evidence, photos: await Promise.all(evidence.photos.map(encodePhoto)) };
  return transact(WORK_EVIDENCE, "readwrite", (store, resolve, reject) => { const request = store.put(stored); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
}
export function getWorkEvidence(batchId: string): Promise<WorkerWorkEvidence | undefined> {
  return transact<WorkerWorkEvidence | undefined>(WORK_EVIDENCE, "readonly", (store, resolve, reject) => { const request = store.get(batchId); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }).then(item => item ? { ...item, photos: item.photos.map(decodePhoto) } : undefined);
}
export function deleteWorkEvidence(batchId: string): Promise<void> {
  return transact(WORK_EVIDENCE, "readwrite", (store, resolve, reject) => { const request = store.delete(batchId); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
}
export function listWorkEvidence(): Promise<WorkerWorkEvidence[]> {
  return transact<WorkerWorkEvidence[]>(WORK_EVIDENCE, "readonly", (store, resolve, reject) => { const request = store.getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }).then(items => items.map(item => ({ ...item, photos: item.photos.map(decodePhoto) })));
}

export function deleteWorkerDraft(id: string): Promise<void> {
  return transact(DRAFTS, "readwrite", (store, resolve, reject) => { const request = store.delete(id); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
}

export function listWorkerDrafts(): Promise<WorkerLocalDraft[]> {
  return transact<WorkerLocalDraft[]>(DRAFTS, "readonly", (store, resolve, reject) => { const request = store.getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }).then(items => items.map(item => ({ ...item, photos: item.photos.map(decodePhoto) })));
}

export function cacheWorkerTasks(cache: CachedWorkerTasks): Promise<void> {
  return transact(TASKS, "readwrite", (store, resolve, reject) => { const request = store.put(cache); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
}

export function getCachedWorkerTasks(accountId: string, date: string): Promise<CachedWorkerTasks | undefined> {
  return transact(TASKS, "readonly", (store, resolve, reject) => { const request = store.get(`${accountId}:${date}`); request.onsuccess = () => resolve(request.result as CachedWorkerTasks | undefined); request.onerror = () => reject(request.error); });
}

export function getLatestCachedWorkerTasks(date: string): Promise<CachedWorkerTasks | undefined> {
  return transact(TASKS, "readonly", (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const matches = (request.result as CachedWorkerTasks[]).filter((item) => item.date === date).sort((a, b) => b.cachedAt.localeCompare(a.cachedAt));
      resolve(matches[0]);
    };
    request.onerror = () => reject(request.error);
  });
}
