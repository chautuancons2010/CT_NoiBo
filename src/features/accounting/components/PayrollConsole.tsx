"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Input, Select } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataSurface, ListPageLayout } from "@/components/shared/PageLayouts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatBusinessDate } from "@/lib/time/timezone";
import type { PayrollPeriod } from "../types";
import styles from "./PayrollConsole.module.css";

type TimesheetReference = { id: string; code: string; name: string; startDate: string; endDate: string };
const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
const month = (value: string) => { const [year, monthValue] = value.slice(0, 7).split("-"); return `${monthValue}/${year}`; };
const labels = { draft: "Nháp", calculated: "Đã tính", reviewed: "Đã kiểm tra", locked: "Đã khóa", published: "Đã phát hành" };

const payrollColumns: DataTableColumn<PayrollPeriod>[] = [
  { id: "month", header: "Tháng", cell: (item) => <Link className="text-link" href={`/accounting/payroll/${item.id}`}>{month(item.periodMonth)}</Link> },
  { id: "status", header: "Trạng thái", cell: (item) => <StatusBadge status={item.status}>{labels[item.status]}</StatusBadge> },
  { id: "people", header: "Nhân viên", accessor: "lineCount", align: "right" },
  { id: "gross", header: "Tổng thu nhập", cell: (item) => money(item.grossTotal), align: "right" },
  { id: "deduction", header: "Khấu trừ", cell: (item) => money(item.deductionTotal), align: "right" },
  { id: "net", header: "Thực nhận", cell: (item) => <strong>{money(item.netTotal)}</strong>, align: "right" }
];

export function PayrollConsole({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<PayrollPeriod[]>([]);
  const [references, setReferences] = useState<TimesheetReference[]>([]);
  const [selectedReferenceId, setSelectedReferenceId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [listError, setListError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/v1/accounting/payroll", { cache: "no-store" });
    const body = await response.json() as { data?: PayrollPeriod[]; error?: { message?: string } };
    if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải bảng lương.");
    setItems(body.data);
    setListError("");
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load()
      .catch((reason: unknown) => setListError(reason instanceof Error ? reason.message : "Không thể tải bảng lương."))
      .finally(() => setLoading(false)));
    if (canCreate) queueMicrotask(() => void fetch("/api/v1/accounting/payroll/references", { cache: "no-store" }).then(async (response) => {
      const body = await response.json() as { data?: TimesheetReference[]; error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Không thể tải bảng công đã chốt.");
      setReferences(body.data ?? []);
    }).catch((reason: unknown) => setFormError(reason instanceof Error ? reason.message : "Không thể tải bảng công đã chốt.")));
  }, [canCreate, load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setFormError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/accounting/payroll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ timesheetPeriodId: form.get("timesheetPeriodId"), note: form.get("note") || undefined }) });
      const body = await response.json() as { data?: PayrollPeriod; error?: { message?: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tạo bảng lương.");
      router.push(`/accounting/payroll/${body.data.id}`);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Không thể tạo bảng lương.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="page-stack payroll-console">
    <PageHeader action={canCreate ? <Button leftIcon={<Plus aria-hidden="true" size={16} />} onClick={() => setCreateOpen(true)} variant="primary">Lập bảng lương</Button> : undefined} title="Bảng lương" />
    <ListPageLayout>
      <DataSurface className={styles.periods}>
        <div className="data-surface__toolbar"><div className={styles.toolbarLeft}><h2>Các kỳ lương</h2></div><span>{items.length} kỳ</span></div>
        <DataTable ariaLabel="Danh sách kỳ lương" columns={payrollColumns} data={items} emptyDescription="" emptyTitle="Chưa có bảng lương" error={listError} getRowId={(item) => item.id} loading={loading} rowHrefPrefix="/accounting/payroll/" />
        {!loading && !listError && items.length ? <div aria-label="Các kỳ lương" className={styles.mobilePeriods}>
          {items.map((item) => <Link className={styles.period} href={`/accounting/payroll/${item.id}`} key={item.id}>
            <span className={styles.periodTop}><strong>Kỳ {month(item.periodMonth)}</strong><StatusBadge status={item.status}>{labels[item.status]}</StatusBadge></span>
            <span className={styles.periodNet}><small>Thực nhận</small><strong>{money(item.netTotal)}</strong></span>
            <span className={styles.periodMeta}>{item.lineCount} nhân viên</span>
          </Link>)}
        </div> : null}
      </DataSurface>
    </ListPageLayout>
    {canCreate ? <Drawer onClose={() => setCreateOpen(false)} open={createOpen} title="Lập bảng lương">
      <form className="leave-form drawer-form" onSubmit={submit}>
        <Select label="Bảng công đã chốt" name="timesheetPeriodId" onChange={(event) => setSelectedReferenceId(event.target.value)} options={references.map((item) => ({ value: item.id, label: `${item.code} · ${formatBusinessDate(item.startDate)} → ${formatBusinessDate(item.endDate)}` }))} placeholder="Chọn bảng công tháng" required value={selectedReferenceId} />
        <Input label="Ghi chú" name="note" />
        {formError ? <p className="form-error" role="alert">{formError}</p> : null}
        <div className="form-actions"><Button onClick={() => setCreateOpen(false)} type="button">Hủy</Button><Button disabled={saving || !selectedReferenceId} type="submit" variant="primary">{saving ? "Đang tạo..." : "Mở bảng lương"}</Button></div>
      </form>
    </Drawer> : null}
  </div>;
}
