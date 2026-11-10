"use client";

import { ArrowUpRight, Camera, CheckCircle2, Clock3, LogIn, LogOut, Cloud, CloudOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import type { AttendanceDashboard, AttendanceType } from "@/features/attendance/types/attendanceTypes";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";
import { can } from "@/lib/auth/permissions";
import { canSubmitPersonalAttendance } from "@/lib/auth/applicationAccess";
import { getBusinessDateKey } from "@/lib/time/timezone";
import { useLoadingActivity } from "@/lib/ui/useLoadingActivity";
import { AttendanceCameraExperience } from "./AttendanceCameraExperience";
import { withPendingAttendance } from "@/features/attendance/client/pendingDashboard";
import { listPendingAttendance } from "@/features/attendance/client/attendanceQueue";
import { syncAttendanceItem } from "@/features/attendance/client/attendanceSync";
import { rememberAttendanceDashboard } from "@/features/attendance/client/attendanceDashboardCache";
import { AttendanceEvidenceViewer } from "./AttendanceEvidence";
import styles from "./PersonalToday.module.css";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

export function PersonalToday() {
  const user = useCurrentUser();
  const [dashboard, setDashboard] = useState<AttendanceDashboard>();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureType, setCaptureType] = useState<AttendanceType>();
  const [activePhotoId, setActivePhotoId] = useState<string>();
  const dashboardRef = useRef<AttendanceDashboard | undefined>(undefined);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const pendingRef = useRef<Promise<void> | null>(null);
  useLoadingActivity(!dashboard && !error);
  const [today, setToday] = useState(() => new Date());
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  const load = useCallback(() => {
    if (pendingRef.current) return pendingRef.current;
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort("timeout"), 12_000);
    setError("");
    const pending = (async () => {
      try {
        const response = await fetch("/api/v1/attendance/dashboard", { cache: "no-store", signal: controller.signal });
        const body = await response.json() as { data?: AttendanceDashboard; error?: { message?: string } };
        if (controller.signal.aborted) return;
        if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải chấm công.");
        const updated = await withPendingAttendance(body.data).catch(() => body.data!);
        if (controller.signal.aborted) return;
        dashboardRef.current = updated;
        rememberAttendanceDashboard(updated);
        setDashboard(updated);
      } catch (cause) {
        if (controller.signal.aborted && controller.signal.reason !== "timeout") return;
        if (dashboardRef.current) {
          const updated = await withPendingAttendance(dashboardRef.current).catch(() => dashboardRef.current!);
          if (!controller.signal.aborted || controller.signal.reason === "timeout") { dashboardRef.current = updated; setDashboard(updated); }
        }
        setError(controller.signal.reason === "timeout" ? "Kết nối quá lâu. Vui lòng thử lại." : cause instanceof Error ? cause.message : "Không thể tải chấm công.");
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    pendingRef.current = pending;
    void pending.finally(() => { if (pendingRef.current === pending) pendingRef.current = null; });
    return pending;
  }, []);

  useDomainReconciliation("attendance", load);
  useDomainReconciliation("timesheets", load);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(); });
    const timer = window.setInterval(() => setToday(new Date()), 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
      requestRef.current?.abort();
      pendingRef.current = null;
    };
  }, [load]);
  useEffect(() => {
    if (!online || captureOpen || !dashboard?.accountId) return;
    const accountId = dashboard.accountId;
    let active = true;
    let busy = false;
    const flush = async () => {
      if (!active || busy || !navigator.onLine) return;
      busy = true;
      try {
        const items = await listPendingAttendance(accountId);
        for (const item of items) {
          if (!active) break;
          if (item.nextRetryAt && Date.parse(item.nextRetryAt) > Date.now()) continue;
          try { await syncAttendanceItem(item); } catch { /* Keep the real photo and timestamp for retry. */ }
        }
        if (active && items.length) await load();
      } catch { /* Storage errors must not prevent opening the camera. */ }
      finally { busy = false; }
    };
    queueMicrotask(() => void flush());
    const timer = window.setInterval(() => void flush(), 15_000);
    const onVisible = () => { if (document.visibilityState === "visible") void flush(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [online, captureOpen, dashboard?.accountId, load]);

  const date = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(today);
  const historyAllowed = can(user.permissions, "attendance.self.view") || can(user.permissions, "attendance.self_history") || can(user.permissions, "attendance.self");
  const captureAllowed = canSubmitPersonalAttendance(user.permissions);

  if (error && !dashboard) return <section className={`${styles.today} ${styles.error}`} role="alert"><span>{error}</span><button onClick={() => void load()} type="button">Thử lại</button></section>;
  if (!dashboard) return <section aria-busy="true" aria-label="Đang tải ca làm" className={`${styles.today} ${styles.loading}`}><span className={styles.skeleton} /></section>;
  if (captureOpen) return <AttendanceCameraExperience initialCapture initialDashboard={dashboard} initialAttendanceType={captureType} onClose={() => { setCaptureOpen(false); void load(); }} onRecorded={(updated) => { dashboardRef.current = updated; rememberAttendanceDashboard(updated); setDashboard(updated); }} />;

  const checkIn = dashboard.todayEvents.find((event) => event.eventType === "check_in");
  const checkOut = [...dashboard.todayEvents].reverse().find((event) => event.eventType === "check_out");
  const status = !dashboard.policy.attendanceEnabled ? "Tạm ngừng" : `${dashboard.todayEvents.length} lượt hôm nay`;

  return (
    <section aria-label="Ca làm hôm nay" className={styles.today}>
      <time className={styles.date} dateTime={getBusinessDateKey(today)}>{date}</time>
      <div className={styles.card} data-state={!dashboard.policy.attendanceEnabled ? "paused" : dashboard.nextAction}>
        <div className={styles.top}><span><Clock3 aria-hidden="true" size={18} />Ca làm hôm nay</span><span className={styles.status}>{status}</span></div>
        <div className={styles.clockFace}>
          <svg aria-hidden="true" className={styles.dial} viewBox="0 0 240 240"><circle cx="120" cy="120" r="108" /><circle cx="120" cy="120" r="83" />{Array.from({ length: 12 }, (_, index) => <path d="M120 15v10" key={index} transform={`rotate(${index * 30} 120 120)`} />)}<path className={styles.dialHand} d="M120 57v63l42 24" /><circle className={styles.dialCenter} cx="120" cy="120" r="5" /></svg>
          <span className={styles.clockLabel}>HÔM NAY</span>
          <time className={styles.liveClock} dateTime={today.toISOString()} suppressHydrationWarning>{formatTime(today.toISOString())}</time>
          <span className={styles.shift}>{dashboard.policy.shiftName}</span>
          <strong className={styles.hours}>{dashboard.policy.shiftStart} – {dashboard.policy.shiftEnd}</strong>
        </div>
        <div className={styles.content}>
          <dl className={styles.events}>
            <div data-recorded={Boolean(checkIn)}><dt><LogIn aria-hidden="true" size={17} />Chấm vào</dt><dd>{checkIn ? formatTime(checkIn.effectiveAt) : "—"}</dd></div>
            <div data-recorded={Boolean(checkOut)}><dt><LogOut aria-hidden="true" size={17} />Chấm ra</dt><dd>{checkOut ? formatTime(checkOut.effectiveAt) : "—"}</dd></div>
          </dl>
          {captureAllowed ? <div className={styles.action}>{dashboard.policy.attendanceEnabled ? (["check_in", "check_out"] as const).map(type => <button data-primary={dashboard.nextAction === type} key={type} onClick={() => { setCaptureType(type); setCaptureOpen(true); }} type="button"><span className={styles.actionIcon}>{dashboard.nextAction === type ? <Camera aria-hidden="true" size={21} /> : type === "check_in" ? <LogIn aria-hidden="true" size={20} /> : <LogOut aria-hidden="true" size={20} />}</span><span>{type === "check_in" ? "Chấm vào" : "Chấm ra"}</span></button>) : <span className={styles.complete}><CheckCircle2 aria-hidden="true" size={19} />Chấm công tạm ngừng</span>}</div> : null}
        </div>
        <div className={styles.facts}>
          <div className={styles.connection} data-online={online}>{online ? <Cloud aria-hidden="true" size={16} /> : <CloudOff aria-hidden="true" size={16} />}<span>{online ? "Trực tuyến" : "Ngoại tuyến"}</span></div>
          {dashboard.todayEvents.some((event) => event.syncStatus !== "synced") ? <div><span>Chờ đồng bộ lượt chấm</span></div> : null}
        </div>
      </div>
      {historyAllowed ? <Link className={styles.history} href="/attendance/history">Lịch sử chấm công<ArrowUpRight aria-hidden="true" size={17} /></Link> : null}
      {dashboard.todayEvents.filter(event => event.photoId && event.photoStatus === "uploaded").map(event => <button className={styles.photoLink} key={event.id} onClick={() => setActivePhotoId(event.id)} type="button"><Camera aria-hidden="true" size={16} />Xem ảnh {event.eventType === "check_in" ? "chấm vào" : "chấm ra"} · {formatTime(event.effectiveAt)}</button>)}
      <AttendanceEvidenceViewer activeId={activePhotoId} items={dashboard.todayEvents.filter(event => event.photoId && event.photoStatus === "uploaded").map(event => ({ employeeName: user.displayName, event }))} onChange={setActivePhotoId} onClose={() => setActivePhotoId(undefined)} />
    </section>
  );
}
