"use client";

import type { PendingAttendanceItem } from "@/features/attendance/types/attendanceTypes";

const DATABASE_NAME = "chau-tuan-attendance";
const DATABASE_VERSION = 1;
const STORE_NAME = "pending-events";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Không thể mở bộ nhớ chấm công."));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "clientEventId" });
        store.createIndex("ownerAccountId", "ownerAccountId", { unique: false });
        store.createIndex("syncState", "syncState", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function transactStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void
): Promise<T> {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error ?? new Error("Không thể truy cập hàng đợi."));
    action(transaction.objectStore(STORE_NAME), resolve, reject);
  });
}

export function savePendingAttendance(item: PendingAttendanceItem): Promise<void> {
  return transactStore("readwrite", (store, resolve, reject) => {
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function removePendingAttendance(clientEventId: string): Promise<void> {
  return transactStore("readwrite", (store, resolve, reject) => {
    const request = store.delete(clientEventId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function listPendingAttendance(accountId: string): Promise<PendingAttendanceItem[]> {
  return transactStore("readonly", (store, resolve, reject) => {
    const request = store.index("ownerAccountId").getAll(accountId);
    request.onsuccess = () => resolve((request.result ?? []) as PendingAttendanceItem[]);
    request.onerror = () => reject(request.error);
  });
}

export async function countPendingAttendance(accountId: string): Promise<number> {
  return transactStore("readonly", (store, resolve, reject) => {
    const request = store.index("ownerAccountId").count(accountId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
