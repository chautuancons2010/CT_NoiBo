"use client";

import { AttendanceExport } from "@/features/attendance/components/AttendanceExport";

import Link from "next/link";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { FilterBar } from "@/components/shared/FilterBar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { Input, SearchInput, Select } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { reconcileTimesheet } from "../services/timesheetPresentation";
import styles from "./TimesheetPeriodDetail.module.css";
import formStyles from "./TimesheetForms.module.css";
import { DetailPageLayout, ListWorkspace, WorkspaceMetrics } from "@/components/shared/PageLayouts";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ContextTabs } from "@/components/shared/Tabs";
import { LoadingState, ErrorState } from "@/components/shared/States";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";
import type { DailyTimesheet, TimesheetPeriod, TimesheetSummary } from "../types/timesheetTypes";
import { formatBusinessDate } from "@/lib/time/timezone";
import { SectionedForm, FormFields, FormActions } from "@/components/shared/FormLayout";

type Detail = { period: TimesheetPeriod; summaries: TimesheetSummary[]; daily: DailyTimesheet[]; openHighExceptionCount?: number };
type Props = {
  periodId: string; employeeId?: string; canAdjust?: boolean; canExport?: boolean;
  canLock?: boolean; canRecompute?: boolean; canUnlock?: boolean; canViewExceptions?: boolean; canTransferPayroll?: boolean;
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
  const mutationRef = useRef(false);
  const [detail, setDetail] = useState<Detail>();
  const [exportMonth, setExportMonth] = useState("");
  const [tab, setTab] = useState<"summary" | "daily">(employeeId ? "daily" : "summary");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [employeeGroup, setEmployeeGroup] = useState<"all" | "office" | "worker">("all");
  const [search,setSearch]=useState(""),[dateFilter,setDateFilter]=useState(""),[unlockOpen,setUnlockOpen]=useState(false),[unlockReason,setUnlockReason]=useState("");
  const load = useCallback(async () => {
    const response = await fetch(`/api/v1/timesheet-periods/${periodId}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
    const body = await response.json() as { data?: Detail; error?: { message: string } };
    if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải kỳ công.");
    setDetail(body.data);
    setError("");
  }, [periodId]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể tải kỳ công."));

    }, 0);
    return () => window.clearTimeout(timer);
  }, [canExport, load]);
  useDomainReconciliation("timesheets", load);

  const matchesEmployeeGroup = useCallback((employmentTypeName: string) => {
    if (employeeGroup === "all") return true;
    const isWorker = /công nhân|công trường/i.test(employmentTypeName);
    return employeeGroup === "worker" ? isWorker : !isWorker;
  }, [employeeGroup]);
  const daily = useMemo(() => detail?.daily.filter((item) => (!employeeId || item.employeeId === employeeId) && matchesEmployeeGroup(item.employmentTypeName) && (!dateFilter||item.workDate===dateFilter) && `${item.employeeName} ${item.employeeCode}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))) ?? [], [detail, employeeId, matchesEmployeeGroup,dateFilter,search]);
  const summaries = useMemo(() => detail?.summaries.filter((item) => (!employeeId || item.employeeId === employeeId) && matchesEmployeeGroup(item.employmentTypeName) && `${item.employeeName} ${item.employeeCode}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))) ?? [], [detail, employeeId, matchesEmployeeGroup,search]);

  async function action(kind: "recompute" | "lock" | "unlock") {
    if (!detail || mutationRef.current) return;
    let payload: Record<string, unknown> = { rowVersion: detail.period.rowVersion };
    if (kind === "unlock") {
      if (unlockReason.trim().length<3) return;
      payload = { ...payload, reason: unlockReason.trim() };
    }
    mutationRef.current=true;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/timesheet-periods/${periodId}/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(60_000), body: JSON.stringify(payload) });
      const body = await response.json() as { error?: { message: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Không thể cập nhật kỳ công.");
      await load();
      setUnlockOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật kỳ công.");
    } finally { mutationRef.current=false;setBusy(false); }
  }

  if (!detail) return error ? <ErrorState description={error} action={<Button onClick={() => void load().catch(reason => setError(reason instanceof Error ? reason.message : "Không thể tải kỳ công."))}>Thử lại</Button>} /> : <LoadingState title="Đang tải kỳ công" />;
  const period = detail.period;
  const byEmployee=new Map<string,DailyTimesheet[]>();for(const item of detail.daily){const rows=byEmployee.get(item.employeeId)??[];rows.push(item);byEmployee.set(item.employeeId,rows);}
  const mismatches=detail.summaries.filter(item=>reconcileTimesheet(item,byEmployee.get(item.employeeId)??[]).mismatch||!(byEmployee.get(item.employeeId)?.length));
  const summaryColumns: DataTableColumn<TimesheetSummary>[] = [
    { id: "employee", header: "Nhân viên", priority: "primary", sortable: true, accessor: "employeeName", cell: item => <span className="record-identity"><strong>{item.employeeName}</strong></span> },
    { id: "scheduled", header: "Ngày chuẩn", sortable: true, accessor: "scheduledWorkdays", align: "right", width: "compact" },
    { id: "actual", header: "Ngày công", sortable: true, accessor: "actualWorkdays", align: "right", cell: item => <strong>{item.actualWorkdays}</strong> },
    { id: "late", header: "Trễ", cell: (item) => `${item.lateDays} / ${item.lateMinutes}'`, hiddenOnMobile: true },
    { id: "leave", header: "Phép năm", cell: (item) => String(item.annualLeaveDays), hiddenOnMobile: true },
    { id: "absent", header: "Vắng", cell: (item) => String(item.absentDays) },
    { id: "exception", header: "Ngoại lệ", cell: (item) => String(item.exceptionCount) }
  ];
  const dailyColumns: DataTableColumn<DailyTimesheet>[] = [
    { id: "date", header: "Ngày", sortable: true, accessor: "workDate", cell: (item) => formatBusinessDate(item.workDate) },
    ...(!employeeId ? [{ id: "employee", header: "Nhân viên", priority: "primary" as const, cell: (item: DailyTimesheet) => <>{item.employeeName}</> }] : []),
    { id: "shift", header: "Ca", cell: (item) => item.shiftName || "—" },
    { id: "in", header: "Vào", cell: (item) => displayTime(item.effectiveCheckIn) },
    { id: "out", header: "Ra", cell: (item) => displayTime(item.effectiveCheckOut) },
    { id: "fraction", header: "Công", cell: (item) => String(item.workFraction) },
    { id: "late", header: "Trễ", cell: (item) => `${item.lateMinutes}'`, hiddenOnMobile: true },
    { id: "status", header: "Trạng thái", cell: (item) => <StatusBadge tone={item.exceptionCount ? "warning" : "neutral"}>{labels[item.status] ?? item.status}</StatusBadge> }
  ];
  return <DetailPageLayout className={styles.page}>
    <PageHeader title={period.name} meta={<><StatusBadge tone={period.status === "locked" ? "success" : "warning"}>{labels[period.status]}</StatusBadge><span>{formatBusinessDate(period.startDate)} – {formatBusinessDate(period.endDate)}</span><span>Phiên bản {period.version}</span></>}
      action={<>
        {period.status !== "locked" && canRecompute ? <Button disabled={busy} onClick={() => void action("recompute")}>Tính lại</Button> : null}
        {period.status !== "locked" && canLock ? <Button title={mismatches.length ? "Cần đối chiếu dữ liệu công trước khi chốt" : undefined} disabled={busy || !detail.summaries.length || mismatches.length > 0 || Boolean(detail.openHighExceptionCount)} onClick={() => void action("lock")} variant="primary">Chốt kỳ công</Button> : null}
        {period.status === "locked" && canUnlock ? <Button disabled={busy} onClick={() => setUnlockOpen(true)}>Mở khóa</Button> : null}
        <Link className="button button--secondary button--md" href="/timesheets/matrix">Bảng công tháng</Link>
      </>} />
    {mismatches.length ? <details className={styles.reconciliation}><summary><AlertTriangle aria-hidden="true" size={18} /><span>{mismatches.length} hồ sơ thiếu chi tiết ngày hoặc lệch tổng công</span><ChevronDown aria-hidden="true" size={16} /></summary><ul>{mismatches.map(item => <li key={item.employeeId}><Link href={`/timesheets/periods/${periodId}/employees/${item.employeeId}`}><span>{item.employeeName}</span><span>{byEmployee.get(item.employeeId)?.length ? "Lệch tổng công" : "Thiếu chi tiết ngày"}<ChevronRight aria-hidden="true" size={15} /></span></Link></li>)}</ul></details> : null}
    {detail.openHighExceptionCount ? <div className={styles.warning} role="status"><AlertTriangle aria-hidden="true" size={18} /><span>{detail.openHighExceptionCount} ngoại lệ nghiêm trọng chưa xử lý</span>{canViewExceptions ? <Link href={`/timesheets/exceptions?periodId=${periodId}`}>Mở ngoại lệ</Link> : null}</div> : null}
    {error && !unlockOpen ? <p className="form-error" role="alert">{error}</p> : null}
    {canExport ? <AttendanceExport month={exportMonth || period.startDate.slice(0,7)} onMonthChange={setExportMonth}/> : null}
    <ListWorkspace label="Tổng hợp công theo nhân viên" summary={<WorkspaceMetrics items={[{ label: "Nhân viên", value: summaries.length }, { label: "Công thực tế", value: Number(summaries.reduce((sum, item) => sum + item.actualWorkdays, 0).toFixed(2)) }, { label: "Phép năm", value: summaries.reduce((sum, item) => sum + item.annualLeaveDays, 0) }, { label: "Muộn / sớm", value: summaries.reduce((sum, item) => sum + item.lateDays + item.earlyLeaveDays, 0) }]} />} filters={<><div className={styles.dateFilters}><Input label="Ngày công" type="date" min={period.startDate} max={period.endDate} value={dateFilter} onChange={event => { setDateFilter(event.target.value); if(event.target.value)setTab("daily"); }} />{dateFilter ? <Button onClick={() => setDateFilter("")} variant="ghost">Cả kỳ</Button> : null}</div><FilterBar>
        <SearchInput aria-label="Tìm nhân viên trong kỳ công" placeholder="Tên hoặc mã nhân viên" value={search} onChange={event => setSearch(event.target.value)} />
        {!employeeId ? <Select label="Nhóm nhân viên" name="employeeGroup" onChange={event => setEmployeeGroup(event.target.value as "all" | "office" | "worker")} options={[{ value: "all", label: "Tất cả nhân viên" }, { value: "office", label: "Nhân viên văn phòng" }, { value: "worker", label: "Công nhân" }]} value={employeeGroup} /> : null}
        
      </FilterBar></>} navigation={<div className={styles.tabsBar}><ContextTabs items={[
        { label: `Tổng hợp (${summaries.length})`, active: tab === "summary", onSelect: () => setTab("summary") },
        { label: `Chi tiết (${daily.length})`, active: tab === "daily", onSelect: () => setTab("daily") },
        ...(canViewExceptions ? [{ label: "Ngoại lệ", href: `/timesheets/exceptions?periodId=${periodId}` }] : [])
      ]} label="Dữ liệu kỳ công" /></div>} status={search || dateFilter || employeeGroup !== "all" ? <div className="worklist-summary"><span role="status">{tab === "summary" ? summaries.length : daily.length} bản ghi</span><Button size="sm" variant="ghost" onClick={() => { setSearch(""); setDateFilter(""); setEmployeeGroup("all"); }}>Xóa bộ lọc</Button></div> : null}>
{tab === "summary" ? <DataTable ariaLabel="Tổng hợp công theo nhân viên" columns={summaryColumns} data={summaries} emptyDescription="" emptyTitle={search || employeeGroup !== "all" ? "Không có nhân viên phù hợp" : "Chưa có tổng hợp"} getRowId={item => item.employeeId} rowHrefPrefix={`/timesheets/periods/${periodId}/employees/`} pageSize={15} /> : <DataTable ariaLabel="Chi tiết công theo ngày" actions={period.status !== "locked" && canAdjust ? item => <DropdownMenu label={`Thao tác công ${item.employeeName}`}><Link href={`/timesheets/adjustments?periodId=${periodId}&employeeId=${item.employeeId}&date=${item.workDate}&rowVersion=${period.rowVersion}`}>Điều chỉnh</Link></DropdownMenu> : undefined} columns={dailyColumns} data={daily} emptyDescription="" emptyTitle={search || dateFilter ? "Không có ngày công phù hợp" : "Chưa có dữ liệu ngày công"} getRowId={item => item.id} pageSize={15} />}
</ListWorkspace>
    <Drawer title="Mở lại kỳ công" open={unlockOpen} onClose={()=>setUnlockOpen(false)}><SectionedForm className={`${formStyles.stack}`} onSubmit={event=>{event.preventDefault();void action("unlock");}}>
<FormFields><Input label="Lý do mở lại" value={unlockReason} onChange={event=>setUnlockReason(event.target.value)} minLength={3} maxLength={500} required/>{error?<p className="form-error" role="alert">{error}</p>:null}</FormFields>
<FormActions className="form-actions"><Button disabled={busy} onClick={()=>setUnlockOpen(false)} type="button">Hủy</Button><Button busy={busy} variant="primary" disabled={busy||unlockReason.trim().length<3} type="submit">Mở lại kỳ công</Button></FormActions></SectionedForm></Drawer>
  </DetailPageLayout>;
}
