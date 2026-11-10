"use client";

import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown, ClipboardCheck, Download, Info, RefreshCw, Send, UserRound, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { FilterTabs } from "@/components/shared/FilterBar";
import { FileDownloadLink } from "@/components/shared/FileDownloadLink";
import { Input, SearchInput } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { DetailPageLayout, RecordFields, ListWorkspace, WorkspaceMetrics } from "@/components/shared/PageLayouts";
import { RecordHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, LoadingState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";
import { payrollWorkspace, type PayrollWorkspaceFilter } from "../payrollWorkspace";
import type { PayrollDetail, PayrollLine } from "../types";
import { PayslipSendDrawer } from "./PayslipSendDrawer";
import { PayrollSourceTable } from "./PayrollSourceTable";
import styles from "./PayrollDetailConsole.module.css";
import { SectionedForm, FormFields, FormActions } from "@/components/shared/FormLayout";

type Permissions = { calculate: boolean; edit: boolean; lock: boolean; publish: boolean; export: boolean };
const money = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
const month = (value: string) => `${value.slice(5, 7)}/${value.slice(0, 4)}`;
const labels = { draft: "Chờ cập nhật lương", calculated: "Chờ duyệt lương", reviewed: "Chờ duyệt lương", locked: "Đã duyệt lương", published: "Đã phát hành phiếu lương" };

export function PayrollDetailConsole({ id, permissions }: { id: string; permissions: Permissions }) {
  const mutation = useRef(false), request = useRef(0);
  const [data, setData] = useState<PayrollDetail>();
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<PayrollLine>();
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<{ scope: "individual" | "all"; employeeId?: string }>();
  const [page, setPage] = useState(1), [reopen, setReopen] = useState(false), [reason, setReason] = useState("");
  const [checking, setChecking] = useState(false);
  const [periodInfo, setPeriodInfo] = useState(false);
  const [filter, setFilter] = useState<PayrollWorkspaceFilter>("all");
  const load = useCallback(async (signal?: AbortSignal) => {
    const key = ++request.current;
    const response = await fetch(`/api/v1/accounting/payroll/${id}`, { cache: "no-store", signal: signal ?? AbortSignal.timeout(20_000) });
    const body = await response.json() as { data?: PayrollDetail; error?: { message?: string } };
    if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải bảng lương.");
    if (key === request.current && !signal?.aborted) setData(body.data);
  }, [id]);
  useEffect(() => {
    const counter = request, controller = new AbortController();
    queueMicrotask(() => void load(AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]))
      .catch((caught: unknown) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Không thể tải bảng lương."); }));
    return () => { controller.abort(); ++counter.current; };
  }, [load]);
  const reconcile = useCallback(async () => { if (!mutation.current) await load(); }, [load]);
  useDomainReconciliation("dashboard", reconcile);
  async function refresh() {
    if (mutation.current || refreshing) return;
    setRefreshing(true); setError("");
    try { await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể tải bảng lương."); }
    finally { setRefreshing(false); }
  }
  async function act(values: Record<string, unknown>) {
    if (!data || mutation.current) return false;
    mutation.current = true; ++request.current; setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/accounting/payroll/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ rowVersion: data.rowVersion, ...values }), signal: AbortSignal.timeout(60_000) });
      const body = await response.json() as { data?: PayrollDetail; error?: { message?: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể cập nhật bảng lương.");
      setData(body.data); return true;
    } catch (caught) {
      setError(caught instanceof Error && caught.name !== "TimeoutError" ? caught.message : "Chưa nhận được phản hồi. Vui lòng tải lại để kiểm tra.");
      try { await load(); } catch { /* Keep the original error and entered values. */ }
      return false;
    } finally { mutation.current = false; setBusy(false); }
  }
  async function saveLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return;
    const form = new FormData(event.currentTarget);
    if (await act({ action: "update_line", lineId: editing.id, lineRowVersion: editing.rowVersion, baseSalary: Number(form.get("baseSalary")), allowance: Number(form.get("allowance")), bonus: Number(form.get("bonus")), deduction: Number(form.get("deduction")), reason: String(form.get("reason") ?? "").trim() })) setEditing(undefined);
  }
  if (!data) return <DetailPageLayout className={styles.layout}>{error ? <div className={styles.notice}><p className="form-error" role="alert">{error}</p><Button onClick={() => void refresh()} busy={refreshing}>Tải lại</Button></div> : <LoadingState title="Đang mở bảng lương" />}</DetailPageLayout>;
  const workspace = payrollWorkspace(data);
  const activeFilter = workspace.filters.some(option => option.value === filter) ? filter : "all";
  const flow = workspace.flow;
  const approved = data.status === "locked" || data.status === "published";
  const issued = data.lines.some(line => line.payslipStatus === "published");
  const editable = permissions.edit && data.lines.length > 0 && !issued;
  const ready = data.status === "draft" ? flow.inputReady : flow.readyToReview;
  const term = search.trim().toLocaleLowerCase("vi");
  const visible = data.lines.filter(line => `${line.employeeName} ${line.employeeCode}`.toLocaleLowerCase("vi").includes(term) && (activeFilter === "all" || activeFilter === "attention" && workspace.lineAttention.has(line.employeeId) || activeFilter === "pending" && line.deliveryStatus !== "delivered" || activeFilter === "delivered" && line.deliveryStatus === "delivered"));
  const sourceEmployees = workspace.sourceEmployees.filter(employee => `${employee.employeeName} ${employee.employeeCode}`.toLocaleLowerCase("vi").includes(term) && (activeFilter === "all" || activeFilter === "attention" && employee.issues.length > 0 || activeFilter === "ready" && !employee.issues.length));
  const visibleCount = workspace.sourceMode ? sourceEmployees.length : visible.length;
  const pages = Math.max(1, Math.ceil(visibleCount / 20)), currentPage = Math.min(page, pages);
  const chooseFilter = (value: string) => { setFilter(value as PayrollWorkspaceFilter); setPage(1); };
  const employeeHref = (line: PayrollLine) => `/accounting/payroll/${id}/employees/${line.employeeId}`;
  const receipt = (line: PayrollLine) => data.deliveryTrackingAvailable === false ? line.payslipStatus === "published" ? "Đã phát hành" : "Chưa phát hành" : line.payslipStatus !== "published" ? line.deliveryReady === false ? "Chưa có tài khoản" : "Chưa gửi" : line.deliveryStatus === "failed" ? "Gửi lỗi" : line.payslipConfirmedAt ? "Đã xác nhận" : line.payslipViewedAt ? "Đã xem" : line.deliveryStatus === "pending" ? "Đang gửi" : line.deliveryStatus === "delivered" ? "Đã gửi" : "Đã phát hành";
  const openEdit = (line: PayrollLine) => { setError(""); setEditing(line); };
  const columns: DataTableColumn<PayrollLine>[] = [
    { id: "employee", header: "Nhân viên", priority: "primary", cell: line => <div className={styles.sourcePerson}><Avatar name={line.employeeName} /><Link className={styles.person} href={employeeHref(line)}><strong>{line.employeeName}</strong><small>{line.employeeCode}{permissions.publish && line.deliveryAccount?.username ? ` · @${line.deliveryAccount.username}` : ""}</small></Link></div> },
    { id: "net", header: "Thực nhận", cell: line => <strong className={line.netSalary < 0 ? styles.negative : styles.netCell}>{money(line.netSalary)}</strong>, align: "right" },
    { id: "days", header: "Ngày công", cell: line => line.workDays, align: "right", width: "compact" },
    { id: "gross", header: "Thu nhập", cell: line => money(line.baseSalary + line.allowance + line.bonus + (line.leaveCashoutAmount ?? 0)), align: "right" },
    ...(data.lines.some(line => (line.leaveCashoutAmount ?? 0) > 0) ? [{ id: "leave", header: "Phép dư", cell: (line: PayrollLine) => money(line.leaveCashoutAmount ?? 0), align: "right" as const }] : []),
    { id: "deduction", header: "Khấu trừ", cell: line => money(line.deduction), align: "right" },
    { id: "receipt", header: "Phiếu lương", cell: line => <StatusBadge tone={line.deliveryStatus === "failed" ? "error" : line.payslipStatus === "published" ? "success" : "neutral"}>{receipt(line)}</StatusBadge>, align: "center" }
  ];
  const issues = workspace.issues;
  const issueHref = (issue: (typeof issues)[number]) => issue.code === "salary" ? "/accounting/salaries" : issue.employeeId && workspace.sourceId ? `${workspace.sourceHref}/employees/${issue.employeeId}` : workspace.sourceHref;
  const checkCount = workspace.checkCount;
  const updateRequired = !approved && !ready && permissions.calculate && flow.needsRecalculation && flow.inputReady;
  const inspectionPrimary = !approved && !ready && !updateRequired && checkCount > 0;
  const periodStatus = approved ? labels[data.status] : issues.length || data.syncIssue ? "Cần đối chiếu dữ liệu" : flow.needsRecalculation ? "Cần cập nhật lương" : data.status === "draft" ? "Sẵn sàng tính lương" : labels[data.status];
  return <DetailPageLayout className={styles.layout}>
    <RecordHeader title={`Bảng lương tháng ${month(data.periodMonth)}`} status={<StatusBadge tone={approved ? "success" : checkCount ? "warning" : "info"}>{periodStatus}</StatusBadge>} action={<>

        <Button aria-label="Tải lại bảng lương" busy={refreshing} disabled={busy} leftIcon={<RefreshCw aria-hidden="true" size={17} />} onClick={() => void refresh()} />
        {permissions.export && approved && data.lines.length > 0 ? <FileDownloadLink className="button button--secondary button--md" format="xlsx" href={`/api/v1/accounting/payroll/${id}/export`}><Download aria-hidden="true" size={17} />Xuất Excel</FileDownloadLink> : null}
        <DropdownMenu label="Thao tác bảng lương" disabled={busy}>
          <button onClick={() => setPeriodInfo(true)} type="button">Thông tin kỳ lương</button>
          {checkCount > 0 && !inspectionPrimary && !issued ? <button onClick={() => setChecking(true)} type="button">Kiểm tra dữ liệu ({checkCount})</button> : null}
          {!approved && permissions.lock && !ready ? <button disabled type="button">Duyệt lương</button> : null}
          {approved && permissions.edit ? <button onClick={() => { setError(""); setReopen(true); }} type="button">Mở lại điều chỉnh</button> : null}
        </DropdownMenu>
        {inspectionPrimary ? <Button onClick={() => setChecking(true)} variant="primary">Kiểm tra dữ liệu ({checkCount})<ArrowUpRight aria-hidden="true" size={16} /></Button> : null}
        {updateRequired ? <Button busy={busy} onClick={() => void act({ action: "calculate", payBasis: data.readiness?.payBasis ?? "actual" })} variant="primary">Cập nhật lương</Button> : null}
        {!approved && permissions.lock && ready ? <Button busy={busy} disabled={busy} leftIcon={<Check aria-hidden="true" size={17} />} onClick={() => void act({ action: "approve_salary" })} variant="primary">Duyệt lương</Button> : null}
        {permissions.publish && data.deliveryTrackingAvailable !== false && approved ? <span className={styles.sendAction}><DropdownMenu menuWidth={290} variant="primary" disabled={busy || !data.lines.length} label="Gửi phiếu lương" trigger={<><Send aria-hidden="true" size={17} /><span>Gửi phiếu lương</span><ChevronDown aria-hidden="true" size={16} /></>}>
          <div className={styles.sendMenu}>
            <button disabled={busy} onClick={() => setSending({ scope: "individual" })} type="button"><UserRound aria-hidden="true" size={18} /><span>Chọn tài khoản nhận</span></button>
            <button disabled={busy} onClick={() => setSending({ scope: "all" })} type="button"><Users aria-hidden="true" size={18} /><span>Gửi tất cả nhân viên</span></button>
          </div>
        </DropdownMenu></span> : null}
    </>} />
    <ListWorkspace className={styles.sheet} label="Lương nhân viên" summary={data.lines.length ? <WorkspaceMetrics items={[{ label: "Tổng thực nhận", value: money(data.netTotal), primary: true, tone: data.netTotal < 0 ? "error" : undefined }, { label: "Tổng thu nhập", value: money(data.grossTotal) }, { label: "Khấu trừ", value: money(data.deductionTotal) }]} /> : undefined} filters={<><FilterTabs label="Lọc nhân viên kỳ lương" onChange={chooseFilter} options={workspace.filters} value={activeFilter} /><SearchInput aria-label="Tìm nhân viên trong bảng lương" onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Tên hoặc mã nhân viên" value={search} /></>} footer={<footer className={styles.sourceFooter}>
        <Link href={workspace.sourceHref}><ClipboardCheck aria-hidden="true" size={15} />{data.readiness?.timesheetName ?? `Bảng công ${month(data.periodMonth)}`}<ArrowUpRight aria-hidden="true" size={13} /></Link>
        {approved ? <span>{workspace.deliveryAvailable ? `${workspace.delivered} / ${data.lines.length} phiếu đã gửi` : `${flow.sent} / ${data.lines.length} phiếu đã phát hành`}</span> : <span>{data.readiness?.timesheetStatus === "locked" ? "Công đã chốt" : data.readiness ? "Công chưa chốt" : "Chưa có dữ liệu công"}</span>}
        <button aria-label="Thông tin kỳ lương" onClick={() => setPeriodInfo(true)} type="button"><Info aria-hidden="true" size={15} /><span>Thông tin kỳ lương</span></button>
      </footer>}>

<h2 className="sr-only">Nhân viên kỳ lương</h2>
{workspace.sourceMode ? workspace.sourceEmployees.length ? <PayrollSourceTable employees={sourceEmployees.slice((currentPage - 1) * 20, currentPage * 20)} /> : <EmptyState title="Chưa có nhân viên từ bảng công" /> : <>
      <div className={styles.desktopLines}><DataTable actions={line => <DropdownMenu label={`Thao tác lương ${line.employeeName}`}><Link href={employeeHref(line)}>Chi tiết lương</Link>{editable ? <button onClick={() => openEdit(line)} type="button">Chỉnh sửa</button> : null}{permissions.publish && data.deliveryTrackingAvailable !== false && approved && line.deliveryStatus !== "delivered" ? <button onClick={() => setSending({ scope: "individual", employeeId: line.employeeId })} type="button">{line.payslipStatus === "published" ? "Gửi lại" : "Gửi phiếu lương"}</button> : null}{line.payslipId ? <Link href={`/accounting/payslips/${line.payslipId}`}>Xem phiếu lương</Link> : null}</DropdownMenu>} ariaLabel="Lương nhân viên" columns={columns} data={visible.slice((currentPage - 1) * 20, currentPage * 20)} emptyDescription="" emptyTitle="Không có nhân viên phù hợp" getRowId={line => line.id} /></div>
      <div aria-label="Lương nhân viên" className={styles.mobileLines}>{visible.slice((currentPage - 1) * 20, currentPage * 20).map(line => <article className={styles.mobileLine} key={line.id}><Link className={styles.person} href={employeeHref(line)}><strong>{line.employeeName}</strong><small>{line.employeeCode}{permissions.publish && line.deliveryAccount?.username ? ` · @${line.deliveryAccount.username}` : ""}</small></Link><div className={styles.lineNet}><span>Thực nhận</span><strong className={line.netSalary < 0 ? styles.negative : undefined}>{money(line.netSalary)}</strong></div><div className={styles.lineMeta}><span>{line.workDays} ngày công</span><StatusBadge tone={line.deliveryStatus === "failed" ? "error" : line.payslipStatus === "published" ? "success" : "neutral"}>{receipt(line)}</StatusBadge></div><div className={styles.lineActions}><Link className="button button--secondary button--md" href={employeeHref(line)}>Chi tiết</Link>{editable ? <Button onClick={() => openEdit(line)}>Chỉnh sửa</Button> : null}{permissions.publish && data.deliveryTrackingAvailable !== false && approved && line.deliveryStatus !== "delivered" ? <Button onClick={() => setSending({ scope: "individual", employeeId: line.employeeId })}>{line.payslipStatus === "published" ? "Gửi lại" : "Gửi phiếu"}</Button> : null}</div></article>)}</div>
      {!visible.length ? <div className={styles.mobileEmpty}><EmptyState title="Không có nhân viên phù hợp" /></div> : null}
      </>}
{pages > 1 ? <Pagination onPageChange={setPage} page={currentPage} pageCount={pages} /> : null}
</ListWorkspace>
    {error && !editing && !reopen ? <p className="form-error" role="alert">{error}</p> : null}
    <PayslipSendDrawer initialEmployeeId={sending?.employeeId} initialScope={sending?.scope} onClose={() => setSending(undefined)} onUpdated={(updated) => { ++request.current; setData(updated); setError(""); }} open={Boolean(sending)} payrollId={id} />
    <Drawer onClose={() => setPeriodInfo(false)} open={periodInfo} title="Thông tin kỳ lương">
      <RecordFields items={[
        { label: "Bảng công", value: <Link href={workspace.sourceHref}>{data.readiness?.timesheetName ?? `Bảng công ${month(data.periodMonth)}`}</Link> },
        { label: "Trạng thái công", value: data.readiness?.timesheetStatus === "locked" ? "Đã chốt" : data.readiness ? "Chưa chốt" : "Chưa có dữ liệu" },
        { label: "Cơ sở tính", value: data.readiness?.payBasis === "paid_time" ? "Công hưởng lương" : data.readiness?.payBasis === "actual" ? "Công thực tế" : undefined },
        { label: "Nhân viên", value: workspace.employeeCount },
        { label: "Cập nhật", value: Number.isFinite(Date.parse(data.updatedAt)) ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(data.updatedAt)) : undefined }
      ]} />
    </Drawer>
    <Drawer onClose={() => setChecking(false)} open={checking} title="Dữ liệu cần kiểm tra">
      <ul className={styles.issueList}>
        {data.syncIssue ? <li><span>{data.syncIssue}</span><Link href={workspace.sourceHref}>Mở bảng công</Link></li> : null}
        {flow.needsRecalculation ? <li><span>Số liệu lương chưa cập nhật</span>{permissions.calculate && flow.inputReady && !approved ? <Button busy={busy} onClick={() => void act({ action: "calculate", payBasis: data.readiness?.payBasis ?? "actual" })}>Cập nhật lương</Button> : null}</li> : null}
        {flow.negativeLines.map(line => <li key={line.id}><strong>{line.employeeName}</strong><span className={styles.negative}>Thực nhận {money(line.netSalary)}</span><Link href={employeeHref(line)}>Chi tiết lương</Link></li>)}
        {issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.employeeName ? <strong>{issue.employeeName}</strong> : null}<span>{issue.label}</span><Link href={issueHref(issue)}>{issue.code === "salary" ? "Mở hồ sơ lương" : "Mở bảng công"}</Link></li>)}
      </ul>
    </Drawer>
    <Drawer onClose={() => { if (!busy) setEditing(undefined); }} open={Boolean(editing)} title={editing ? `Chỉnh sửa lương · ${editing.employeeName}` : "Chỉnh sửa lương"}>{editing ? <SectionedForm className={`${styles.editForm}`} key={editing.id} onSubmit={saveLine}>
<FormFields>{error ? <p className="form-error" role="alert">{error}</p> : null}<Input defaultValue={editing.baseSalary} disabled={busy} label="Lương theo công" min="0" name="baseSalary" required type="number" /><Input defaultValue={editing.allowance} disabled={busy} label="Phụ cấp" min="0" name="allowance" required type="number" /><Input defaultValue={editing.bonus} disabled={busy} label="Thưởng" min="0" name="bonus" required type="number" /><Input defaultValue={editing.deduction} disabled={busy} label="Khấu trừ" min="0" name="deduction" required type="number" /><Input disabled={busy} label="Lý do điều chỉnh" minLength={3} name="reason" required /></FormFields>
<FormActions className="form-actions"><Button disabled={busy} onClick={() => setEditing(undefined)}>Hủy</Button><Button busy={busy} type="submit" variant="primary">Lưu thay đổi</Button></FormActions></SectionedForm> : null}</Drawer>
    <Drawer onClose={() => { if (!busy) setReopen(false); }} open={reopen} title="Mở lại bảng lương"><SectionedForm className={`${styles.editForm}`} onSubmit={event => { event.preventDefault(); void act({ action: "reopen", reason: reason.trim() }).then(ok => { if (ok) { setReopen(false); setReason(""); } }); }}>
<FormFields>{error ? <p className="form-error" role="alert">{error}</p> : null}{issued ? <StatusBadge tone="warning">Phiếu đã gửi sẽ được thu hồi</StatusBadge> : null}<Input disabled={busy} label="Lý do điều chỉnh" minLength={3} onChange={event => setReason(event.target.value)} required value={reason} /></FormFields>
<FormActions className="form-actions"><Button disabled={busy} onClick={() => setReopen(false)}>Hủy</Button><Button busy={busy} disabled={busy || reason.trim().length < 3} type="submit" variant="primary">Mở lại điều chỉnh</Button></FormActions></SectionedForm></Drawer>
  </DetailPageLayout>;
}
