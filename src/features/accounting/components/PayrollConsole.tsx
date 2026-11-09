"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronDown, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/shared/Button";
import { FilterBar, FilterTabs } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { SearchInput, Select } from "@/components/shared/FormControls";
import { PageHeader } from "@/components/shared/PageHeader";
import { ListPageLayout, ListWorkspace } from "@/components/shared/PageLayouts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";
import type { PayrollPeriod } from "../types";
import { PayslipSendDrawer } from "./PayslipSendDrawer";
import styles from "./PayrollConsole.module.css";

const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
const month = (value: string) => `${value.slice(5, 7)}/${value.slice(0, 4)}`;
const labels = { draft: "Chờ cập nhật lương", calculated: "Chờ duyệt lương", reviewed: "Chờ duyệt lương", locked: "Đã duyệt lương", published: "Đã phát hành phiếu" };
const columns: DataTableColumn<PayrollPeriod>[] = [
  { id: "month", header: "Tháng", cell: item => <Link className="text-link" href={`/accounting/payroll/${item.id}`}>{month(item.periodMonth)}</Link> },
  { id: "status", header: "Trạng thái", cell: item => <span className={styles.statusStack}><StatusBadge tone={item.status === "locked" || item.status === "published" ? "success" : "warning"}>{labels[item.status]}</StatusBadge>{item.syncIssue ? <StatusBadge tone="warning">Cần cập nhật công</StatusBadge> : null}{item.pendingDeliveryCount ? <StatusBadge tone="warning">{item.pendingDeliveryCount} phiếu chờ gửi</StatusBadge> : null}</span> },
  { id: "people", header: "Nhân viên", accessor: "lineCount", align: "right" },
  { id: "gross", header: "Tổng thu nhập", cell: item => item.lineCount ? money(item.grossTotal) : "—", align: "right" },
  { id: "deduction", header: "Khấu trừ", cell: item => item.lineCount ? money(item.deductionTotal) : "—", align: "right" },
  { id: "net", header: "Thực nhận", cell: item => <strong>{item.lineCount ? money(item.netTotal) : "—"}</strong>, align: "right" }
];
const salaryPending = (item: PayrollPeriod) => !["locked", "published"].includes(item.status);
function initialFilter(value: string) { return ["draft", "calculated", "reviewed"].includes(value) ? "salary" : ["all", "pending", "salary", "locked", "published"].includes(value) ? value : "all"; }

export function PayrollConsole({ canPublish = false, initialStatus = "pending" }: { canCreate?: boolean; canPublish?: boolean; initialStatus?: string }) {
  const [items, setItems] = useState<PayrollPeriod[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [status, setStatus] = useState(initialFilter(initialStatus)), [search, setSearch] = useState(""), [year, setYear] = useState("all");
  const [sendingId, setSendingId] = useState<string>();
  const load = useCallback(async () => {
    const response = await fetch("/api/v1/accounting/payroll", { cache: "no-store", signal: AbortSignal.timeout(20_000) });
    const body = await response.json() as { data?: PayrollPeriod[]; error?: { message?: string } };
    if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải bảng lương.");
    setItems(body.data); setError("");
  }, []);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load().catch(caught => { if (active) setError(caught.message); }).finally(() => { if (active) setLoading(false); }); }); return () => { active = false; }; }, [load]);
  useDomainReconciliation("dashboard", load);
  const candidates = items.filter(item => (year === "all" || item.periodMonth.startsWith(year)) && `${item.periodMonth.slice(0, 7)} ${month(item.periodMonth)} ${labels[item.status]}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
  const matches = (item: PayrollPeriod, value: string) => value === "all" || value === "pending" && (item.status !== "published" || Boolean(item.syncIssue) || (item.pendingDeliveryCount ?? 0) > 0) || value === "salary" && salaryPending(item) || item.status === value;
  const visible = candidates.filter(item => matches(item, status)).sort((a, b) => ["pending", "salary"].includes(status) ? a.periodMonth.localeCompare(b.periodMonth) : b.periodMonth.localeCompare(a.periodMonth));
  const queueFilters = [{ value: "all", label: "Tất cả" }, { value: "pending", label: "Cần xử lý" }, { value: "salary", label: "Chờ duyệt" }, { value: "locked", label: "Đã duyệt" }, { value: "published", label: "Đã phát hành" }].map(option => ({ ...option, label: `${option.label} ${candidates.filter(item => matches(item, option.value)).length}` }));
  const canSend = (item: PayrollPeriod) => canPublish && item.deliveryTrackingAvailable !== false && (item.status === "locked" || item.status === "published" && Boolean(item.pendingDeliveryCount));
  const action = (item: PayrollPeriod) => item.deliveryTrackingAvailable === false ? "Xem bảng lương" : item.status === "published" ? item.pendingDeliveryCount ? "Gửi lại phiếu lương" : "Xem bảng lương" : item.status === "locked" ? "Gửi phiếu lương" : "Duyệt lương";
  return <ListPageLayout className="payroll-console"><PageHeader title="Bảng lương" />
    <ListWorkspace className={styles.periods} label="Danh sách kỳ lương"
      navigation={<FilterTabs label="Lọc kỳ lương" onChange={setStatus} options={queueFilters} value={status} />}
      filters={<FilterBar><SearchInput aria-label="Tìm kỳ lương" onChange={event => setSearch(event.target.value)} placeholder="Tìm tháng, trạng thái" value={search} /><Select label="Năm kỳ lương" labelHidden onChange={event => setYear(event.target.value)} options={[{ value: "all", label: "Tất cả năm" }, ...[...new Set(items.map(item => item.periodMonth.slice(0, 4)))].sort().reverse().map(value => ({ value, label: value }))]} value={year} /></FilterBar>}
      status={<span>{visible.length} / {items.length} kỳ</span>}>
<DataTable actions={item => canSend(item) ? <Button onClick={() => setSendingId(item.id)} size="sm">{action(item)}</Button> : <Link aria-label={action(item)} className="button button--secondary button--sm" href={`/accounting/payroll/${item.id}`} title={action(item)}>Mở</Link>} ariaLabel="Danh sách kỳ lương" columns={columns} data={visible} emptyDescription="" emptyTitle={items.length ? "Không có kỳ lương phù hợp" : "Chưa có bảng công đã chốt"} error={error} getRowId={item => item.id} loading={loading} rowHrefPrefix="/accounting/payroll/" />
{error ? <div className={styles.retry}><Button busy={loading} onClick={() => { setLoading(true); void load().catch(caught => setError(caught.message)).finally(() => setLoading(false)); }}>Tải lại</Button></div> : null}
{!loading && !error && visible.length ? <div aria-label="Các kỳ lương" className={styles.mobilePeriods}>{visible.map(item => <article className={styles.period} key={item.id}><Link className={styles.periodTop} href={`/accounting/payroll/${item.id}`}><strong>Tháng {month(item.periodMonth)}</strong><StatusBadge tone={salaryPending(item) ? "warning" : "success"}>{labels[item.status]}</StatusBadge></Link><div className={styles.periodNet}><small>Thực nhận</small><strong>{item.lineCount ? money(item.netTotal) : "—"}</strong></div><div className={styles.periodMeta}><span><UsersRound aria-hidden="true" size={16} />{item.lineCount} nhân viên</span><Link aria-label={`Mở bảng lương tháng ${month(item.periodMonth)}`} className={styles.periodOpen} href={`/accounting/payroll/${item.id}`}><ArrowUpRight aria-hidden="true" size={20} /></Link></div><details className={styles.periodBreakdown}><summary><span>Tổng hợp thu nhập</span><ChevronDown aria-hidden="true" size={18} /></summary><dl><div><dt>Thu nhập</dt><dd>{money(item.grossTotal)}</dd></div><div><dt>Khấu trừ</dt><dd>{money(item.deductionTotal)}</dd></div></dl></details>{item.syncIssue ? <StatusBadge tone="warning">Cần cập nhật công</StatusBadge> : null}{item.pendingDeliveryCount ? <StatusBadge tone="warning">{item.pendingDeliveryCount} phiếu chờ gửi</StatusBadge> : null}<>{canSend(item) ? <Button onClick={() => setSendingId(item.id)}>{action(item)}</Button> : <Link className="button button--secondary button--md" href={`/accounting/payroll/${item.id}`}>{action(item)}</Link>}</></article>)}</div> : null}
</ListWorkspace>
  <PayslipSendDrawer initialScope="all" onClose={() => setSendingId(undefined)} onUpdated={(updated) => setItems(current => current.map(item => item.id === updated.id ? { ...item, status: updated.status, rowVersion: updated.rowVersion, grossTotal: updated.grossTotal, deductionTotal: updated.deductionTotal, netTotal: updated.netTotal, pendingDeliveryCount: updated.lines.filter(line => line.payslipStatus === "published" && line.deliveryStatus !== "delivered").length } : item))} open={Boolean(sendingId)} payrollId={sendingId ?? ""} /></ListPageLayout>;
}
