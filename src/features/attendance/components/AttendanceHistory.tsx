"use client";

import { AlertTriangle, CheckCircle2, Clock3, ImageIcon, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Card } from "@/components/shared/Card";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Tabs } from "@/components/shared/Tabs";
import type { AttendanceHistoryDay } from "@/features/attendance/types/attendanceTypes";

function time(value?: string) {
  return value ? new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)) : "—";
}

const statusMeta = {
  complete: { label: "Đủ lượt chấm", tone: "success" as const },
  missing_check_out: { label: "Thiếu chấm ra", tone: "warning" as const },
  late: { label: "Đi trễ", tone: "warning" as const },
  pending: { label: "Chờ đồng bộ", tone: "info" as const }
};

export function AttendanceHistory({ selectedDate }: { selectedDate?: string }) {
  const [days, setDays] = useState<AttendanceHistoryDay[]>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    void fetch("/api/v1/attendance/history", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { data?: AttendanceHistoryDay[]; error?: { message: string } };
        if (!response.ok || !body.data) throw new Error(body.error?.message);
        setDays(body.data);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Không thể tải lịch sử."));
  }, []);
  if (!days && !error) return <LoadingState />;
  if (!days) return <ErrorState description={error} />;
  const selected = selectedDate ? days.find((day) => day.date === selectedDate) : undefined;
  return (
    <div className="attendance-page">
      <Tabs label="Chấm công cá nhân" items={[{ label: "Hôm nay", href: "/attendance" }, { label: "Lịch sử", href: "/attendance/history", active: true }, { label: "Kiểm tra", href: "/attendance/records" }]} />
      {selectedDate ? (
        selected ? <AttendanceDayDetail day={selected} /> : <ErrorState title="Không có dữ liệu" description="Ngày này chưa có lượt chấm công." />
      ) : (
        <div className="attendance-history-list">
          {days.map((day) => {
            const meta = statusMeta[day.status];
            return <Link href={`/attendance/history/${day.date}`} key={day.date}><Card><div><strong>{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${day.date}T12:00:00`))}</strong><span>{time(day.checkIn?.effectiveAt)} → {time(day.checkOut?.effectiveAt)}</span></div><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge></Card></Link>;
          })}
          {days.length === 0 ? <Card>Chưa có lịch sử chấm công.</Card> : null}
        </div>
      )}
    </div>
  );
}

function AttendanceDayDetail({ day }: { day: AttendanceHistoryDay }) {
  return (
    <div className="attendance-day-detail">
      <Link className="text-link" href="/attendance/history">← Lịch sử</Link>
      <h3>{new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${day.date}T12:00:00`))}</h3>
      {[day.checkIn, day.checkOut].map((event, index) => event ? (
        <Card key={event.id}>
          <div className="attendance-detail-heading"><span>{event.eventType === "check_in" ? "Chấm vào" : "Chấm ra"}</span><strong>{time(event.effectiveAt)}</strong><StatusBadge tone={event.syncStatus === "synced" ? "success" : "warning"}>{event.syncStatus === "synced" ? "Đã đồng bộ" : "Chờ đồng bộ"}</StatusBadge></div>
          <div className="attendance-detail-grid"><span><MapPin size={16} />{event.locationName ?? "Không có địa điểm"}</span><span>{event.photoId ? <ImageIcon size={16} /> : <AlertTriangle size={16} />}{event.photoId ? <Link href={`/attendance/photos/${event.photoId}`}>Xem ảnh</Link> : "Ảnh chưa đồng bộ"}</span><span>{event.geofenceStatus === "valid" ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}{event.geofenceStatus === "valid" ? "Vị trí hợp lệ" : "Cần kiểm tra"}</span></div>
        </Card>
      ) : <Card key={index}><div className="attendance-missing"><AlertTriangle size={18} />{index === 0 ? "Chưa có lượt chấm vào" : "Chưa có lượt chấm ra"}</div></Card>)}
    </div>
  );
}
