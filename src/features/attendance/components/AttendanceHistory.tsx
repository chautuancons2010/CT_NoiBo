"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, ImageIcon, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { AttendanceHistoryDay } from "@/features/attendance/types/attendanceTypes";
import { formatBusinessDate } from "@/lib/time/timezone";

const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const statusMeta = {
  complete: { label: "Đủ công", tone: "success" as const },
  missing_check_out: { label: "Thiếu công", tone: "error" as const },
  late: { label: "Đi muộn", tone: "warning" as const },
  pending: { label: "Chờ đồng bộ", tone: "info" as const },
  leave: { label: "Nghỉ phép", tone: "info" as const },
  business_trip: { label: "Công tác", tone: "info" as const },
  holiday: { label: "Ngày lễ", tone: "warning" as const },
  rest_day: { label: "Ngày nghỉ", tone: "neutral" as const }
};
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const time = (value?: string) => value ? new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value)) : "—";

export function AttendanceHistory({ selectedDate }: { selectedDate?: string }) {
  const [month, setMonth] = useState(() => selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date());
  const [days, setDays] = useState<AttendanceHistoryDay[]>();
  const [error, setError] = useState("");
  const [activeDate, setActiveDate] = useState<string>();
  const range = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const leading = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - leading);
    return { first, last, cells: Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; }) };
  }, [month]);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ from: dateKey(range.first), to: dateKey(range.last) });
    void fetch(`/api/v1/attendance/history?${params}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const body = await response.json() as { data?: AttendanceHistoryDay[]; error?: { message: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải lịch công.");
      setDays(body.data);
      setError("");
    }).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải lịch công."); });
    return () => controller.abort();
  }, [range.first, range.last]);
  useEffect(() => {
    if (!activeDate) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setActiveDate(undefined); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [activeDate]);

  if (!days && !error) return <LoadingState />;
  if (!days) return <ErrorState description={error} />;
  const byDate = new Map(days.map((day) => [day.date, day]));
  if (selectedDate) {
    const selected = byDate.get(selectedDate);
    return selected ? <AttendanceDayDetail day={selected} /> : <ErrorState title="Không có dữ liệu" description="Ngày này chưa có dữ liệu công." />;
  }
  const selected = activeDate ? byDate.get(activeDate) : undefined;

  return <div className="attendance-page"><Card className="attendance-calendar">
    <header><div><h2>Lịch công của tôi</h2><span>Tháng {String(month.getMonth() + 1).padStart(2, "0")}/{month.getFullYear()}</span></div><div>
      <Button aria-label="Tháng trước" onClick={() => { setDays(undefined); setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)); }} size="sm" variant="ghost"><ChevronLeft size={17} /></Button>
      <Button onClick={() => { setDays(undefined); setMonth(new Date()); }} size="sm" variant="secondary">Hôm nay</Button>
      <Button aria-label="Tháng sau" onClick={() => { setDays(undefined); setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)); }} size="sm" variant="ghost"><ChevronRight size={17} /></Button>
    </div></header>
    <div className="attendance-calendar__weekdays">{weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
    <div className="attendance-calendar__grid">{range.cells.map((date) => {
      const key = dateKey(date);
      const day = byDate.get(key);
      const outside = date.getMonth() !== month.getMonth();
      const meta = day ? statusMeta[day.status] : undefined;
      return <button aria-label={`${formatBusinessDate(key)}${meta ? `, ${meta.label}` : ""}`} aria-pressed={activeDate === key} className={`${outside ? "is-outside " : ""}${day ? `is-${day.status}` : "is-empty"}`} disabled={!day || outside} key={key} onClick={() => setActiveDate(key)} type="button"><span>{date.getDate()}</span>{meta ? <><strong>{meta.label}</strong>{day?.checkIn || day?.checkOut ? <small>{time(day.checkIn?.effectiveAt)} – {time(day.checkOut?.effectiveAt)}</small> : null}</> : null}</button>;
    })}</div>
    <footer>{Object.entries(statusMeta).filter(([status]) => status !== "pending").map(([status, meta]) => <span className={`is-${status}`} key={status}>{meta.label}</span>)}</footer>
  </Card>
    {selected ? <div className="attendance-day-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveDate(undefined); }} role="presentation"><aside aria-label={`Chi tiết công ${formatBusinessDate(selected.date)}`} aria-modal="true" className="attendance-day-drawer" role="dialog"><button aria-label="Đóng" className="attendance-day-drawer__close" onClick={() => setActiveDate(undefined)} type="button"><X size={18} /></button><AttendanceDayDetail day={selected} /></aside></div> : null}
  </div>;
}

function AttendanceDayDetail({ day }: { day: AttendanceHistoryDay }) {
  const minutes = day.checkIn && day.checkOut ? Math.max(0, Math.round((new Date(day.checkOut.effectiveAt).getTime() - new Date(day.checkIn.effectiveAt).getTime()) / 60000)) : 0;
  return <div className="attendance-day-detail">
    <h3>{new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(`${day.date}T12:00:00+07:00`))}</h3>
    <StatusBadge tone={statusMeta[day.status].tone}>{statusMeta[day.status].label}</StatusBadge>
    <dl className="attendance-day-summary"><div><dt>Ca làm</dt><dd>{day.shiftName ?? "—"} · {day.shiftStart ?? "—"} – {day.shiftEnd ?? "—"}</dd></div><div><dt>Giờ vào</dt><dd>{time(day.checkIn?.effectiveAt)}</dd></div><div><dt>Giờ ra</dt><dd>{time(day.checkOut?.effectiveAt)}</dd></div><div><dt>Tổng thời gian</dt><dd>{minutes ? `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút` : "—"}</dd></div></dl>
    {[day.checkIn, day.checkOut].map((event, index) => event ? <Card key={event.id}><div className="attendance-detail-heading"><span>{event.eventType === "check_in" ? "Chấm vào" : "Chấm ra"}</span><strong>{time(event.effectiveAt)}</strong></div><div className="attendance-detail-grid"><span><MapPin size={16} />{event.locationName ?? "Không có địa điểm"}</span><span><ImageIcon size={16} />{event.photoId ? <Link href={`/attendance/photos/${event.photoId}`}>Xem ảnh</Link> : "Chưa có ảnh"}</span></div></Card> : day.status === "missing_check_out" && index === 1 ? <div className="attendance-missing" key="missing"><AlertTriangle size={17} />Thiếu lượt chấm ra</div> : null)}
    {day.status === "missing_check_out" ? <Link className="button button--primary" href={`/attendance/requests?date=${day.date}`}>Gửi yêu cầu điều chỉnh</Link> : null}
  </div>;
}
