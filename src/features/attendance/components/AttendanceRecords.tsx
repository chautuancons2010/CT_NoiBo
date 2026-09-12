"use client";

import { Eye, ImageOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { ImageLightbox } from "@/components/shared/ImageLightbox";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Tabs } from "@/components/shared/Tabs";
import type { AttendanceEvent } from "@/features/attendance/types/attendanceTypes";

function time(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

export function AttendanceRecords() {
  const [records, setRecords] = useState<AttendanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activePhotoId, setActivePhotoId] = useState<string>();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (from) query.set("from", from);
      if (to) query.set("to", to);
      const response = await fetch(`/api/v1/attendance/records?${query}`, { cache: "no-store" });
      const body = await response.json() as { data?: AttendanceEvent[]; error?: { message: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message);
      setRecords(body.data);
      setError(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải danh sách.");
    } finally { setLoading(false); }
  }, [from, to]);
  useEffect(() => { queueMicrotask(() => void load()); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const images = useMemo(() => records.filter((record) => record.photoId).map((record) => ({
    id: record.photoId!,
    src: `/api/v1/attendance/photos/${record.photoId}`,
    alt: `Ảnh chấm công ${record.employeeName ?? record.employeeCode}`,
    title: `${record.employeeName ?? "Nhân viên"} · ${time(record.effectiveAt)}`,
    metadata: { "Nhân viên": record.employeeName ?? "—", "Loại": record.eventType === "check_in" ? "Chấm vào" : "Chấm ra", "Địa điểm": record.locationName ?? "—", "Vị trí": record.geofenceStatus === "valid" ? "Hợp lệ" : "Cần kiểm tra", "Đồng bộ": record.syncStatus === "synced" ? "Đã đồng bộ" : "Đang chờ" }
  })), [records]);

  const columns: DataTableColumn<AttendanceEvent>[] = [
    { id: "employee", header: "Nhân viên", cell: (row) => <Link className="text-link" href={`/attendance/records/${row.id}`}>{row.employeeName ?? row.employeeCode}</Link> },
    { id: "time", header: "Thời gian", cell: (row) => time(row.effectiveAt) },
    { id: "type", header: "Loại", cell: (row) => row.eventType === "check_in" ? "Chấm vào" : "Chấm ra" },
    { id: "location", header: "Địa điểm", cell: (row) => row.locationName ?? "—", hiddenOnMobile: true },
    { id: "status", header: "Trạng thái", cell: (row) => <StatusBadge tone={row.attendanceStatus === "recorded" ? "success" : "warning"}>{row.attendanceStatus === "recorded" ? "Đã ghi nhận" : "Cần kiểm tra"}</StatusBadge> },
    { id: "photo", header: "Ảnh", cell: (row) => row.photoId ? <Button leftIcon={<Eye size={15} />} onClick={() => setActivePhotoId(row.photoId)} size="sm">Xem ảnh</Button> : <span className="attendance-no-photo"><ImageOff size={15} />{row.photoStatus === "not_required" ? "Không yêu cầu" : "Chưa đồng bộ"}</span> }
  ];

  return (
    <div className="attendance-page">
      <Tabs label="Chấm công cá nhân" items={[{ label: "Hôm nay", href: "/attendance" }, { label: "Lịch sử", href: "/attendance/history" }, { label: "Kiểm tra", href: "/attendance/records", active: true }]} />
      <FilterBar actions={<Button onClick={() => void load()} variant="primary">Lọc</Button>}><label className="compact-field"><span>Từ ngày</span><input className="input" onChange={(event) => setFrom(event.target.value)} type="date" value={from} /></label><label className="compact-field"><span>Đến ngày</span><input className="input" onChange={(event) => setTo(event.target.value)} type="date" value={to} /></label></FilterBar>
      <DataTable columns={columns} data={records} emptyDescription="Chưa có lượt chấm công phù hợp." emptyTitle="Không có dữ liệu" error={error} getRowId={(row) => row.id} loading={loading} />
      <ImageLightbox images={images} initialImageId={activePhotoId} onClose={() => setActivePhotoId(undefined)} open={Boolean(activePhotoId)} />
    </div>
  );
}
