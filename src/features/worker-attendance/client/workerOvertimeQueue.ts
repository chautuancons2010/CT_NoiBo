"use client";
import type { z } from "zod";
import type { workerOvertimeTimeEntrySchema } from "../schemas/workerAttendanceSchemas";
import type { WorkerAttendanceSession } from "../types/workerAttendanceTypes";
import { readWorkerResponse } from "./workerAttendanceSync";

export type WorkerOvertimeTimeEntry = z.infer<typeof workerOvertimeTimeEntrySchema>;
const key = (owner: string) => `ct:worker-overtime-queue:v1:${owner}`;
export function readWorkerOvertimeQueue(owner: string): WorkerOvertimeTimeEntry[] {
  const raw = localStorage.getItem(key(owner));
  const rows: unknown = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(rows) || rows.some(row => row.ownerAccountId !== owner)) throw new Error("Không đọc được tăng ca đã lưu trên thiết bị.");
  return rows;
}
export function enqueueWorkerOvertime(input: WorkerOvertimeTimeEntry) {
  const rows = readWorkerOvertimeQueue(input.ownerAccountId);
  if (rows.some(row => row.clientSessionId === input.clientSessionId)) return;
  localStorage.setItem(key(input.ownerAccountId), JSON.stringify([...rows, input]));
  window.dispatchEvent(new Event("worker-overtime-queue-changed"));
}
const pending = new Map<string, Promise<WorkerAttendanceSession[]>>();
export function syncWorkerOvertimeQueue(owner: string): Promise<WorkerAttendanceSession[]> {
  const active = pending.get(owner); if (active) return active;
  const task = (async () => {
    const synced: WorkerAttendanceSession[] = [];
    if (!navigator.onLine) return synced;
    for (const input of readWorkerOvertimeQueue(owner)) {
      const session = await readWorkerResponse<WorkerAttendanceSession>(await fetch("/api/v1/worker-attendance/overtime", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(20_000)
      }));
      localStorage.setItem(key(owner), JSON.stringify(readWorkerOvertimeQueue(owner).filter(row => row.clientSessionId !== input.clientSessionId)));
      synced.push(session);
      window.dispatchEvent(new CustomEvent("worker-overtime-synced", { detail: session }));
    }
    return synced;
  })();
  pending.set(owner, task);
  void task.finally(() => { if (pending.get(owner) === task) pending.delete(owner); }).catch(() => undefined);
  return task;
}
