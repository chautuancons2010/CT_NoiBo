"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/components/shared/Card";
import type { DailyTimesheet, TimesheetPeriod, TimesheetSummary } from "@/features/timesheets/types/timesheetTypes";

const statusSymbol: Record<string, string> = {
  full_work: "X", late: "M", early_leave: "M", missing_check_in: "!", missing_check_out: "!",
  annual_leave: "P", unpaid_leave: "P", absent: "V", business_trip: "CT", holiday: "L", rest_day: "–", worker_site: "X", needs_review: "!"
};

function dates(from: string, to: string) {
  const result: string[] = [];
  const cursor = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  while (cursor <= end && result.length < 62) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

export function TimesheetMatrix() {
  const [periods, setPeriods] = useState<TimesheetPeriod[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [summaries, setSummaries] = useState<TimesheetSummary[]>([]);
  const [daily, setDaily] = useState<DailyTimesheet[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/timesheet-periods", { signal: controller.signal }).then(async (response) => {
      const body = await response.json() as { data?: TimesheetPeriod[]; error?: { message: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Không thể tải kỳ công.");
      setPeriods(body.data ?? []);
      setPeriodId((current) => current || body.data?.[0]?.id || "");
      if (!body.data?.length) setLoading(false);
    }).catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "Không thể tải kỳ công."); setLoading(false); } });
    return () => controller.abort();
  }, []);
  const load = useCallback(async (id: string, signal?: AbortSignal) => {
    const response = await fetch(`/api/v1/timesheet-periods/${id}`, { cache: "no-store", signal });
    const body = await response.json() as { data?: { summaries: TimesheetSummary[]; daily: DailyTimesheet[] }; error?: { message: string } };
    if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải bảng công.");
    setSummaries(body.data.summaries);
    setDaily(body.data.daily);
    setError("");
    setLoading(false);
  }, []);
  useEffect(() => {
    if (!periodId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => { setLoading(true); void load(periodId, controller.signal).catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "Không thể tải bảng công."); setLoading(false); } }); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load, periodId]);

  const period = periods.find((item) => item.id === periodId);
  const days = useMemo(() => period ? dates(period.startDate, period.endDate) : [], [period]);
  const byEmployeeDate = useMemo(() => new Map(daily.map((item) => [`${item.employeeId}:${item.workDate}`, item])), [daily]);
  return <Card className="timesheet-matrix-card">
    <div className="panel-header"><h2>Ngày công theo nhân viên</h2><label className="timesheet-matrix-period">Kỳ công <select className="select" onChange={(event) => setPeriodId(event.target.value)} value={periodId}>{periods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
    {period ? <p className="timesheet-matrix-range">{period.startDate} – {period.endDate} · {period.status === "locked" ? "Đã chốt" : "Đang tổng hợp"}</p> : null}
    {error ? <p className="form-error">{error}</p> : null}
    {loading ? <p>Đang tải bảng công…</p> : !period ? <p>Chưa có kỳ công.</p> : <div className="timesheet-matrix-scroll"><table className="timesheet-matrix"><thead><tr><th scope="col">Nhân viên</th>{days.map((date) => <th key={date} scope="col" title={date}>{date.slice(-2)}</th>)}<th scope="col">Tổng</th></tr></thead><tbody>{summaries.map((summary) => <tr key={summary.employeeId}><th scope="row"><Link href={`/timesheets/periods/${period.id}/employees/${summary.employeeId}`}>{summary.employeeName}<small>{summary.employeeCode}</small></Link></th>{days.map((date) => { const record = byEmployeeDate.get(`${summary.employeeId}:${date}`); return <td key={date}>{record ? <Link aria-label={`${summary.employeeName}, ${date}: ${record.status}`} className={`timesheet-matrix__day is-${record.status}`} href={`/timesheets/periods/${period.id}/employees/${summary.employeeId}?date=${date}`} title={`${date} · ${record.status}`}>{statusSymbol[record.status] ?? "?"}</Link> : <span className="timesheet-matrix__blank">—</span>}</td>; })}<td><strong>{summary.actualWorkdays}</strong></td></tr>)}{!summaries.length ? <tr><td colSpan={days.length + 2}>Kỳ này chưa được tổng hợp.</td></tr> : null}</tbody></table></div>}
    <div className="timesheet-matrix-legend"><span>X · Đủ công</span><span>M · Đi muộn/về sớm</span><span>! · Thiếu công</span><span>P · Nghỉ phép</span><span>CT · Công tác</span><span>L · Ngày lễ</span></div>
  </Card>;
}
