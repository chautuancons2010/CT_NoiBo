"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Users } from "lucide-react";

import { AttendancePhotoReview } from "@/features/attendance/components/AttendancePhotoReview";
import type { AttendanceAdminToday } from "@/features/attendance/types/attendanceTypes";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";
import styles from "./AttendanceAdminDashboard.module.css";
import { WorkerAttendanceSessionList } from "@/features/worker-attendance/components/WorkerAttendanceHome";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export function AttendanceAdminDashboard({ ownerAccountId, canViewWorkers = false }: { ownerAccountId?: string; canViewWorkers?: boolean }) {
  const [date, setDate] = useState(today);
  const [data, setData] = useState<AttendanceAdminToday>();
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [source, setSource] = useState<"personal" | "field">("personal");
  const requestRef = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    if (source !== "personal") return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setRefreshing(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/attendance/admin/today?date=${encodeURIComponent(date)}`, { cache: "no-store", signal: controller.signal });
      const body = await response.json() as { data?: AttendanceAdminToday; error?: { message: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải dữ liệu chấm công.");
      if (!controller.signal.aborted) setData(body.data);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải dữ liệu chấm công.");
    } finally {
      if (!controller.signal.aborted) setRefreshing(false);
    }
  }, [date, source]);
  useEffect(() => {
    if (source !== "personal") return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => { window.clearTimeout(timer); requestRef.current?.abort(); };
  }, [load, source]);
  useDomainReconciliation("attendance", load);

  // Never render or inspect evidence left over from a different selected day.
  return <div className="page-stack">
    {canViewWorkers ? <nav aria-label="Phạm vi kiểm tra công" className={styles.sourceNav} role="tablist">
      <button aria-controls="attendance-review-panel" aria-selected={source === "personal"} id="attendance-review-personal" onClick={() => setSource("personal")} role="tab" type="button"><Camera aria-hidden="true" size={17} />Ảnh cá nhân</button>
      <button aria-controls="attendance-review-panel" aria-selected={source === "field"} id="attendance-review-field" onClick={() => setSource("field")} role="tab" type="button"><Users aria-hidden="true" size={17} />Điểm danh công trường</button>
    </nav> : null}
    <div aria-labelledby={source === "field" ? "attendance-review-field" : "attendance-review-personal"} className="page-stack" id="attendance-review-panel" role={canViewWorkers ? "tabpanel" : undefined}>
    {source === "field" && canViewWorkers
      ? <WorkerAttendanceSessionList detailBasePath="/employees/field-attendance" />
      : <AttendancePhotoReview data={data?.date === date ? data : undefined} date={date} error={error} onDateChange={setDate} onRefresh={load} ownerAccountId={ownerAccountId} refreshing={refreshing} />}
    </div>
  </div>;
}
