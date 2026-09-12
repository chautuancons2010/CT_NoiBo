"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Card } from "@/components/shared/Card";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { AttendanceEvent } from "@/features/attendance/types/attendanceTypes";

export function AttendanceRecordDetail({ id }: { id: string }) {
  const [event, setEvent] = useState<AttendanceEvent>();
  const [error, setError] = useState<string>();
  useEffect(() => { void fetch(`/api/v1/attendance/records/${id}`, { cache: "no-store" }).then(async (response) => { const body = await response.json() as { data?: AttendanceEvent; error?: { message: string } }; if (!response.ok || !body.data) throw new Error(body.error?.message); setEvent(body.data); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Không thể tải dữ liệu.")); }, [id]);
  if (!event && !error) return <LoadingState />;
  if (!event) return <ErrorState description={error} />;
  const rows = [
    ["Nhân viên", `${event.employeeName ?? "—"} · ${event.employeeCode ?? "—"}`],
    ["Loại", event.eventType === "check_in" ? "Chấm vào" : "Chấm ra"],
    ["Thời gian hiệu lực", new Date(event.effectiveAt).toLocaleString("vi-VN")],
    ["Server nhận", new Date(event.receivedAtServer).toLocaleString("vi-VN")],
    ["Địa điểm", event.locationName ?? "—"],
    ["Khoảng cách", event.distanceMeters === undefined ? "—" : `${Math.round(event.distanceMeters)} m`],
    ["Độ chính xác GPS", event.accuracyMeters === undefined ? "—" : `${Math.round(event.accuracyMeters)} m`],
    ["Đồng bộ", event.syncStatus === "synced" ? "Đã đồng bộ" : "Đang chờ"]
  ];
  return <div className="attendance-day-detail"><Link className="text-link" href="/attendance/records">← Danh sách</Link><Card><div className="attendance-detail-heading"><strong>{event.employeeName}</strong><StatusBadge tone={event.attendanceStatus === "recorded" ? "success" : "warning"}>{event.attendanceStatus === "recorded" ? "Đã ghi nhận" : "Cần kiểm tra"}</StatusBadge></div><dl className="attendance-record-meta">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{event.photoId ? <Link className="button button--secondary button--md" href={`/attendance/photos/${event.photoId}`}>Xem ảnh</Link> : <span>Ảnh chưa đồng bộ</span>}</Card></div>;
}
