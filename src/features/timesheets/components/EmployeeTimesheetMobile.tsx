"use client";

import Link from "next/link";
import { Clock3, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/components/shared/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";
import type { DailyTimesheet, TimesheetPeriod, TimesheetSummary } from "../types/timesheetTypes";

const label: Record<string, string> = {
  full_work: "Đủ công", late: "Đi trễ", early_leave: "Về sớm", missing_check_in: "Thiếu chấm vào",
  missing_check_out: "Thiếu chấm ra", annual_leave: "Nghỉ phép", unpaid_leave: "Nghỉ không lương",
  absent: "Vắng", business_trip: "Công tác", holiday: "Ngày lễ", rest_day: "Ngày nghỉ",
  worker_site: "Công trường", needs_review: "Cần rà soát"
};
const time = (value?: string) => value ? new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";

export function EmployeeTimesheetMobile({ periodId, employeeId, selectedDate }: { periodId: string; employeeId: string; selectedDate?: string }) {
  const [period, setPeriod] = useState<TimesheetPeriod>();
  const [daily, setDaily] = useState<DailyTimesheet[]>([]);
  const [summary, setSummary] = useState<TimesheetSummary>();
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/timesheet-periods/${periodId}`, { cache: "no-store" });
      const body = await response.json() as { data?: { period: TimesheetPeriod; daily: DailyTimesheet[]; summaries: TimesheetSummary[] }; error?: { message: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải công nhân viên.");
      setPeriod(body.data.period);
      setDaily(body.data.daily.filter((item) => item.employeeId === employeeId));
      setSummary(body.data.summaries.find((item) => item.employeeId === employeeId));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải công nhân viên.");
    }
  }, [periodId, employeeId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useDomainReconciliation("timesheets", load);
  const grouped = useMemo(() => [...daily].filter((item) => !selectedDate || item.workDate === selectedDate).sort((a, b) => b.workDate.localeCompare(a.workDate)), [daily, selectedDate]);
  if (error) return <Card><p className="form-error" role="alert">{error}</p></Card>;
  if (!period) return <Card>Đang tải…</Card>;
  return <div className="employee-timesheet">
    <Card className="employee-timesheet__summary"><div><strong>{period.name}</strong><span>{period.startDate} – {period.endDate}</span></div>
      {summary ? <div className="employee-timesheet__stats"><span><b>{summary.actualWorkdays}</b>Ngày công</span><span><b>{summary.lateDays}</b>Ngày trễ</span><span><b>{summary.annualLeaveDays}</b>Phép năm</span><span><b>{summary.exceptionCount}</b>Ngoại lệ</span></div> : null}
    </Card>
    {selectedDate ? <div className="timesheet-selected-date"><strong>{selectedDate}</strong><Link href={`/timesheets/periods/${periodId}/employees/${employeeId}`}>Xem tất cả ngày</Link></div> : null}
    <div className="employee-timesheet__days">{grouped.map((item) => <Card className="employee-timesheet__day" key={item.id}>
      <div className="employee-timesheet__date"><strong>{new Date(`${item.workDate}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}</strong><TimesheetStatus item={item} /></div>
      <div className="employee-timesheet__time"><Clock3 size={17} /><b>{time(item.effectiveCheckIn)} → {time(item.effectiveCheckOut)}</b><span>{item.shiftName || "—"}</span></div>
      {item.lateMinutes > 0 ? <span>Đi trễ {item.lateMinutes} phút</span> : null}
      {item.earlyLeaveMinutes > 0 ? <span>Về sớm {item.earlyLeaveMinutes} phút</span> : null}
      {item.exceptionCount > 0 ? <Link href={`/timesheets/exceptions?periodId=${periodId}`}><TriangleAlert size={16} />Ngoại lệ: {item.exceptionCount}</Link> : null}
    </Card>)}{!grouped.length ? <Card>Chưa có dữ liệu công.</Card> : null}</div>
  </div>;
}

function TimesheetStatus({ item }: { item: DailyTimesheet }) {
  return <StatusBadge tone={item.exceptionCount ? "warning" : item.status === "full_work" || item.status === "holiday" ? "success" : "neutral"}>{label[item.status] ?? item.status}</StatusBadge>;
}
