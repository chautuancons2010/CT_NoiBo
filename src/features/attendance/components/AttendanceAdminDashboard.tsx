"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/shared/Button";
import { Card, StatCard } from "@/components/shared/Card";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { AttendanceAdminToday, AttendanceAdminTodayRow } from "@/features/attendance/types/attendanceTypes";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";

const labels = { present: "Có mặt", late: "Đi muộn", leave: "Nghỉ", not_checked: "Chưa chấm", missing_check: "Thiếu lượt" } as const;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const time = (value?: string) => value ? new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value)) : "—";
const duration = (minutes: number) => minutes ? `${Math.floor(minutes / 60)}g ${minutes % 60}p` : "—";

export function AttendanceAdminDashboard() {
  const [date, setDate] = useState(today);
  const [departmentId, setDepartmentId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<AttendanceAdminToday>();
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const response = await fetch(`/api/v1/attendance/admin/today?date=${encodeURIComponent(date)}`, { cache: "no-store" });
    const body = await response.json() as { data?: AttendanceAdminToday; error?: { message: string } };
    if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải dữ liệu chấm công.");
    setData(body.data);
    setError("");
  }, [date]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể tải dữ liệu.")), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useDomainReconciliation("attendance", load);

  const departments = useMemo(() => [...new Map((data?.rows ?? []).filter((row) => row.departmentId).map((row) => [row.departmentId!, row.departmentName])).entries()], [data]);
  const shifts = useMemo(() => [...new Map((data?.rows ?? []).filter((row) => row.shiftId).map((row) => [row.shiftId!, row.shiftName])).entries()], [data]);
  const rows = useMemo(() => (data?.rows ?? []).filter((row) => (!departmentId || row.departmentId === departmentId) && (!shiftId || row.shiftId === shiftId) && (!status || row.status === status)), [data, departmentId, shiftId, status]);
  const columns: DataTableColumn<AttendanceAdminTodayRow>[] = [
    { id: "employee", header: "Nhân viên", cell: (row) => <span><strong>{row.employeeName}</strong><br /><small>{row.employeeCode} · {row.departmentName}</small></span> },
    { id: "shift", header: "Ca", cell: (row) => row.shiftName },
    { id: "in", header: "Giờ vào", cell: (row) => time(row.checkIn) },
    { id: "out", header: "Giờ ra", cell: (row) => time(row.checkOut) },
    { id: "late", header: "Đi muộn", cell: (row) => row.lateMinutes ? `${row.lateMinutes} phút` : "—", align: "right" },
    { id: "early", header: "Về sớm", cell: (row) => row.earlyLeaveMinutes ? `${row.earlyLeaveMinutes} phút` : "—", align: "right", hiddenOnMobile: true },
    { id: "hours", header: "Tổng giờ", cell: (row) => duration(row.totalMinutes), align: "right" },
    { id: "status", header: "Trạng thái", cell: (row) => <StatusBadge tone={row.status === "present" ? "success" : row.status === "late" || row.status === "missing_check" ? "warning" : row.status === "leave" ? "info" : "neutral"}>{labels[row.status]}</StatusBadge> }
  ];

  return <div className="page-stack">
    <div className="attendance-admin-kpis">
      <StatCard label="Tổng nhân viên" value={String(data?.totalEmployees ?? 0)} />
      <StatCard label="Có mặt" value={String(data?.present ?? 0)} />
      <StatCard label="Đi muộn" value={String(data?.late ?? 0)} />
      <StatCard label="Nghỉ" value={String(data?.leave ?? 0)} />
      <StatCard label="Chưa chấm" value={String(data?.notChecked ?? 0)} />
      <StatCard label="Thiếu lượt" value={String(data?.missingCheck ?? 0)} />
    </div>
    <Card>
      <div className="panel-header"><h2>Chấm công hôm nay</h2><Link className="button button--secondary button--sm" href="/attendance/logs">Nhật ký công</Link></div>
      <div className="attendance-admin-filters">
        <label>Ngày<input className="input" onChange={(event) => setDate(event.target.value)} type="date" value={date} /></label>
        <label>Phòng ban<select className="select" onChange={(event) => setDepartmentId(event.target.value)} value={departmentId}><option value="">Tất cả</option>{departments.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>Ca<select className="select" onChange={(event) => setShiftId(event.target.value)} value={shiftId}><option value="">Tất cả</option>{shifts.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>Trạng thái<select className="select" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">Tất cả</option>{Object.entries(labels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
        <Button onClick={() => void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể tải dữ liệu."))} size="sm" variant="secondary">Làm mới</Button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <DataTable columns={columns} data={rows} emptyDescription="" emptyTitle="Chưa có nhân viên" getRowId={(row) => row.employeeId} loading={!data} rowHrefPrefix="/attendance/logs?employeeId=" />
    </Card>
  </div>;
}
