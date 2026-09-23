"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/components/shared/Card";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { Select } from "@/components/shared/FormControls";
import { DataSurface, DetailPageLayout } from "@/components/shared/PageLayouts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";
import type { DailyTimesheet, ReportTemplate, TimesheetPeriod, TimesheetSummary } from "../types/timesheetTypes";

type Detail = { period: TimesheetPeriod; summaries: TimesheetSummary[]; daily: DailyTimesheet[] };
type Props = {
  periodId: string; employeeId?: string; canAdjust?: boolean; canExport?: boolean;
  canLock?: boolean; canRecompute?: boolean; canUnlock?: boolean; canViewExceptions?: boolean;
};
const labels: Record<string, string> = {
  open: "Mở", reviewing: "Đang rà soát", locked: "Đã khóa", reopened: "Đã mở lại",
  full_work: "Đủ công", late: "Đi trễ", early_leave: "Về sớm", missing_check_in: "Thiếu vào",
  missing_check_out: "Thiếu ra", annual_leave: "Phép năm", unpaid_leave: "Nghỉ không lương",
  absent: "Vắng", business_trip: "Công tác", holiday: "Ngày lễ", rest_day: "Ngày nghỉ",
  worker_site: "Công trường", needs_review: "Cần rà soát"
};
const displayTime = (value?: string) => value ? new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";

export function TimesheetPeriodDetail({ periodId, employeeId, canAdjust = false, canExport = false, canLock = false, canRecompute = false, canUnlock = false, canViewExceptions = false }: Props) {
  const [detail, setDetail] = useState<Detail>();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [tab, setTab] = useState<"summary" | "daily">(employeeId ? "daily" : "summary");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [employeeGroup, setEmployeeGroup] = useState<"all" | "office" | "worker">("all");
  const load = useCallback(async () => {
    const response = await fetch(`/api/v1/timesheet-periods/${periodId}`, { cache: "no-store" });
    const body = await response.json() as { data?: Detail; error?: { message: string } };
    if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải kỳ công.");
    setDetail(body.data);
    setError("");
  }, [periodId]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể tải kỳ công."));
      if (canExport) void fetch("/api/v1/report-templates").then((response) => response.json()).then((body: { data?: ReportTemplate[] }) => {
        const items = (body.data ?? []).filter((item) => item.reportType === "timesheet");
        setTemplates(items);
        setTemplateId(items[0]?.id ?? "");
      }).catch(() => {});
    }, 0);
    return () => window.clearTimeout(timer);
  }, [canExport, load]);
  useDomainReconciliation("timesheets", load);

  const matchesEmployeeGroup = useCallback((employmentTypeName: string) => {
    if (employeeGroup === "all") return true;
    const isWorker = /công nhân|công trường/i.test(employmentTypeName);
    return employeeGroup === "worker" ? isWorker : !isWorker;
  }, [employeeGroup]);
  const daily = useMemo(() => detail?.daily.filter((item) => (!employeeId || item.employeeId === employeeId) && matchesEmployeeGroup(item.employmentTypeName)) ?? [], [detail, employeeId, matchesEmployeeGroup]);
  const summaries = useMemo(() => detail?.summaries.filter((item) => (!employeeId || item.employeeId === employeeId) && matchesEmployeeGroup(item.employmentTypeName)) ?? [], [detail, employeeId, matchesEmployeeGroup]);

  async function action(kind: "recompute" | "lock" | "unlock") {
    if (!detail) return;
    let payload: Record<string, unknown> = { rowVersion: detail.period.rowVersion };
    if (kind === "unlock") {
      const reason = window.prompt("Lý do mở khóa");
      if (!reason) return;
      payload = { ...payload, reason };
    }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/timesheet-periods/${periodId}/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json() as { error?: { message: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Không thể cập nhật kỳ công.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật kỳ công.");
    } finally { setBusy(false); }
  }

  async function exportExcel() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/v1/report-exports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId, periodId }) });
      const body = await response.json() as { data?: { id: string }; error?: { message: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể xuất tệp.");
      window.open(`/api/v1/report-exports/${body.data.id}/download`, "_self");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể xuất tệp.");
    } finally { setBusy(false); }
  }

  if (!detail) return <Card>{error ? <p className="form-error" role="alert">{error}</p> : "Đang tải…"}</Card>;
  const period = detail.period;
  const summaryColumns: DataTableColumn<TimesheetSummary>[] = [
    { id: "employee", header: "Nhân viên", cell: (item) => <><strong>{item.employeeName}</strong><br /><small>{item.employeeCode}</small></> },
    { id: "scheduled", header: "Ngày chuẩn", cell: (item) => String(item.scheduledWorkdays) },
    { id: "actual", header: "Ngày công", cell: (item) => String(item.actualWorkdays) },
    { id: "minutes", header: "Phút làm", cell: (item) => String(item.workedMinutes), hiddenOnMobile: true },
    { id: "late", header: "Trễ", cell: (item) => `${item.lateDays} / ${item.lateMinutes}'`, hiddenOnMobile: true },
    { id: "leave", header: "Phép năm", cell: (item) => String(item.annualLeaveDays), hiddenOnMobile: true },
    { id: "absent", header: "Vắng", cell: (item) => String(item.absentDays) },
    { id: "exception", header: "Ngoại lệ", cell: (item) => String(item.exceptionCount) }
  ];
  const dailyColumns: DataTableColumn<DailyTimesheet>[] = [
    { id: "date", header: "Ngày", accessor: "workDate" },
    ...(!employeeId ? [{ id: "employee", header: "Nhân viên", cell: (item: DailyTimesheet) => <>{item.employeeName}<br /><small>{item.employeeCode}</small></> }] : []),
    { id: "shift", header: "Ca", cell: (item) => item.shiftName || "—" },
    { id: "in", header: "Vào", cell: (item) => displayTime(item.effectiveCheckIn) },
    { id: "out", header: "Ra", cell: (item) => displayTime(item.effectiveCheckOut) },
    { id: "fraction", header: "Công", cell: (item) => String(item.workFraction) },
    { id: "late", header: "Trễ", cell: (item) => `${item.lateMinutes}'`, hiddenOnMobile: true },
    { id: "status", header: "Trạng thái", cell: (item) => <StatusBadge tone={item.exceptionCount ? "warning" : "neutral"}>{labels[item.status] ?? item.status}</StatusBadge> }
  ];
  return <DetailPageLayout>
    <div className="timesheet-period-bar"><div><strong>{period.name}</strong><span>{period.startDate} – {period.endDate}</span><StatusBadge tone={period.status === "locked" ? "success" : "warning"}>{labels[period.status]}</StatusBadge><span>v{period.version}</span></div>
      <div>
        {period.status !== "locked" && canRecompute ? <button className="button button--secondary" disabled={busy} onClick={() => void action("recompute")} type="button">Tính lại</button> : null}
        {period.status !== "locked" && canLock ? <button className="button button--primary" disabled={busy} onClick={() => void action("lock")} type="button">Chốt kỳ công</button> : null}
        {period.status === "locked" && canUnlock ? <button className="button button--secondary" disabled={busy} onClick={() => void action("unlock")} type="button">Mở khóa</button> : null}
        {canExport ? <><select aria-label="Mẫu xuất" className="select" onChange={(event) => setTemplateId(event.target.value)} value={templateId}>{templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="button button--secondary" disabled={busy || !templateId} onClick={() => void exportExcel()} type="button">Xuất Excel</button></> : null}
      </div>
    </div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <div className="timesheet-tabs"><button className={tab === "summary" ? "is-active" : ""} onClick={() => setTab("summary")} type="button">Tổng hợp ({summaries.length})</button><button className={tab === "daily" ? "is-active" : ""} onClick={() => setTab("daily")} type="button">Chi tiết ({daily.length})</button>{canViewExceptions ? <Link href={`/timesheets/exceptions?periodId=${periodId}`}>Ngoại lệ</Link> : null}</div>
    {!employeeId ? <div className="timesheet-period-filter"><Select label="Nhóm nhân viên" name="employeeGroup" onChange={(event) => setEmployeeGroup(event.target.value as "all" | "office" | "worker")} options={[{ value: "all", label: "Tất cả nhân viên" }, { value: "office", label: "Nhân viên văn phòng" }, { value: "worker", label: "Công nhân" }]} value={employeeGroup} /></div> : null}
    <DataSurface>{tab === "summary" ? <DataTable columns={summaryColumns} data={summaries} emptyDescription="" emptyTitle="Chưa có tổng hợp" getRowId={(item) => item.employeeId} rowHrefPrefix={`/timesheets/periods/${periodId}/employees/`} /> : <DataTable actions={period.status !== "locked" && canAdjust ? (item) => <DropdownMenu label={`Thao tác công ${item.employeeName}`}><Link href={`/timesheets/adjustments?periodId=${periodId}&employeeId=${item.employeeId}&date=${item.workDate}&rowVersion=${period.rowVersion}`}>Điều chỉnh</Link></DropdownMenu> : undefined} columns={dailyColumns} data={daily} emptyDescription="" emptyTitle="Chưa có dữ liệu ngày công" getRowId={(item) => item.id} />}</DataSurface>
  </DetailPageLayout>;
}
