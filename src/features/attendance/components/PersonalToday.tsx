"use client";

import { ArrowUpRight, MapPin, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import type { AttendanceDashboard } from "@/features/attendance/types/attendanceTypes";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";
import { can } from "@/lib/auth/permissions";
import { getBusinessDateKey } from "@/lib/time/timezone";

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
  const [error, setError] = useState("");
  const [today, setToday] = useState(() => new Date());
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/attendance/dashboard", { cache: "no-store" });
      const body = await response.json() as { data?: AttendanceDashboard; error?: { message?: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải chấm công.");
      setDashboard(body.data);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải chấm công.");
    }
  }, []);

  useDomainReconciliation("attendance", load);
  useEffect(() => {
    queueMicrotask(() => void load());
    const timer = window.setInterval(() => setToday(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const date = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(today);
  const historyAllowed = can(user.permissions, "attendance.self.view") || can(user.permissions, "attendance.self_history") || can(user.permissions, "attendance.self");

  if (error && !dashboard) return <section className="personal-today personal-today--error" role="alert"><span>{error}</span><button onClick={() => void load()} type="button">Thử lại</button></section>;
  if (!dashboard) return <section aria-busy="true" aria-label="Đang tải ca làm" className="personal-today personal-today--loading"><span className="personal-today__skeleton" /></section>;

  const checkIn = dashboard.todayEvents.find((event) => event.eventType === "check_in");
  const checkOut = [...dashboard.todayEvents].reverse().find((event) => event.eventType === "check_out");
  const status = !dashboard.policy.attendanceEnabled ? "Tạm ngừng" : dashboard.nextAction === "check_in" ? "Chưa chấm vào" : dashboard.nextAction === "check_out" ? "Đã chấm vào" : "Đã hoàn tất";

  return <section aria-label="Ca làm hôm nay" className="personal-today">
    <time className="personal-today__date" dateTime={getBusinessDateKey(today)}>{date}</time>
    <div className="personal-today__card">
      <div className="personal-today__top"><span>Ca làm hôm nay</span><span className="personal-today__status" data-state={dashboard.nextAction}>{status}</span></div>
      <strong className="personal-today__hours">{dashboard.policy.shiftStart} – {dashboard.policy.shiftEnd}</strong>
      <span className="personal-today__shift">{dashboard.policy.shiftName}</span>
      <div className="personal-today__facts">
        <div><MapPin aria-hidden="true" size={18} /><span>{dashboard.locations.map((location) => location.name).join(", ") || "Chưa gán địa điểm"}</span></div>
        <div>{online ? <Wifi aria-hidden="true" size={18} /> : <WifiOff aria-hidden="true" size={18} />}<span>{online ? "Trực tuyến" : "Ngoại tuyến"}</span></div>
      </div>
      <dl className="personal-today__events">
        <div><dt>Chấm vào</dt><dd>{checkIn ? formatTime(checkIn.effectiveAt) : "—"}</dd></div>
        <div><dt>Chấm ra</dt><dd>{checkOut ? formatTime(checkOut.effectiveAt) : "—"}</dd></div>
      </dl>
    </div>
    {dashboard.incompletePreviousDate ? <Link className="personal-today__warning" href={`/attendance/history/${dashboard.incompletePreviousDate}`}>Thiếu lượt chấm ngày {dashboard.incompletePreviousDate}<ArrowUpRight aria-hidden="true" size={16} /></Link> : null}
    {historyAllowed ? <Link className="personal-today__history" href="/attendance/history">Lịch sử chấm công<ArrowUpRight aria-hidden="true" size={17} /></Link> : null}
  </section>;
}
