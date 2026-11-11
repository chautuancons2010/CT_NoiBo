"use client";
import { useEffect } from "react";
import { listPendingAttendance } from "@/features/attendance/client/attendanceQueue";
import { syncAttendanceItem } from "@/features/attendance/client/attendanceSync";
import { listWorkerDrafts } from "@/features/worker-attendance/client/workerDraftStore";
import { syncWorkerDraft } from "@/features/worker-attendance/client/workerAttendanceSync";

export function AttendanceConnectivity({ accountId, pathname }: { accountId: string; pathname: string }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let disposed = false;
    void navigator.serviceWorker.register("/attendance-sw.js", { scope: "/", updateViaCache: "none" }).then(async () => {
      const registration = await navigator.serviceWorker.ready;
      if (!disposed) registration.active?.postMessage({ type: "ATTENDANCE_OWNER", id: accountId, path: pathname });
    }).catch(() => { /* Offline capture still uses IndexedDB if cache registration is unavailable. */ });
    return () => { disposed = true; };
  }, [accountId, pathname]);
  useEffect(() => {
    let disposed = false, busy = false;
    async function flush() {
      if (disposed || busy || !navigator.onLine || document.visibilityState === "hidden") return;
      busy = true;
      try {
        const pending = await listPendingAttendance(accountId);
        for (const item of pending) {
          if (disposed) break;
          if (item.nextRetryAt && Date.parse(item.nextRetryAt) > Date.now()) continue;
          try { await syncAttendanceItem(item); } catch { /* Durable queue retains failures. */ }
        }
        const drafts = await listWorkerDrafts();
        for (const draft of drafts) if (!disposed && draft.ownerAccountId === accountId && draft.pendingSubmit) {
          try { await syncWorkerDraft(draft); } catch { /* Retain the draft and all original photos. */ }
        }
      } catch { /* Storage failures remain visible in the capture screen. */ }
      finally { busy = false; }
    }
    const navigateOffline = (event: MouseEvent) => {
      if (navigator.onLine || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (anchor && anchor.origin === location.origin && !anchor.download && (!anchor.target || anchor.target === "_self")) { event.preventDefault(); location.assign(anchor.href); }
    };
    void flush(); const timer = window.setInterval(() => void flush(), 15_000);
    const resume = () => void flush();
    window.addEventListener("online", resume); window.addEventListener("focus", resume); document.addEventListener("visibilitychange", resume); document.addEventListener("click", navigateOffline, true);
    return () => { disposed = true; window.clearInterval(timer); window.removeEventListener("online", resume); window.removeEventListener("focus", resume); document.removeEventListener("visibilitychange", resume); document.removeEventListener("click", navigateOffline, true); };
  }, [accountId]);
  return null;
}
