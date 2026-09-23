"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Input, Select } from "@/components/shared/FormControls";
import { DataSurface, ListPageLayout } from "@/components/shared/PageLayouts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatBusinessDate } from "@/lib/time/timezone";
import type { PayrollPeriod } from "../types";

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
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/v1/accounting/payroll", { cache: "no-store" });
    const body = await response.json() as { data?: PayrollPeriod[]; error?: { message?: string } };
    if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải bảng lương.");
    setItems(body.data);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể tải bảng lương.")));
    if (canCreate) queueMicrotask(() => void fetch("/api/v1/accounting/payroll/references", { cache: "no-store" }).then(async (response) => {
      const body = await response.json() as { data?: TimesheetReference[] };
      setReferences(body.data ?? []);
    }));
  }, [canCreate, load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/accounting/payroll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ timesheetPeriodId: form.get("timesheetPeriodId"), note: form.get("note") || undefined }) });
      const body = await response.json() as { data?: PayrollPeriod; error?: { message?: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tạo bảng lương.");
      router.push(`/accounting/payroll/${body.data.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tạo bảng lương.");
    } finally {
      setSaving(false);
    }
  }

  return <ListPageLayout>
    {canCreate ? <Card className="payroll-create-workspace"><div className="panel-header"><h2>Lập bảng lương từ bảng công</h2></div><form className="inline-form" onSubmit={submit}><Select label="Bảng công đã chốt" name="timesheetPeriodId" onChange={(event) => setSelectedReferenceId(event.target.value)} options={references.map((item) => ({ value: item.id, label: `${item.code} · ${formatBusinessDate(item.startDate)} → ${formatBusinessDate(item.endDate)}` }))} placeholder="Chọn bảng công tháng" required value={selectedReferenceId} /><Input label="Ghi chú" name="note" /><Button disabled={saving || !selectedReferenceId} type="submit" variant="primary">{saving ? "Đang tạo..." : "Mở bảng lương"}</Button></form></Card> : null}
    <DataSurface><DataTable columns={payrollColumns} data={items} emptyDescription="" emptyTitle="Chưa có bảng lương" error={error} getRowId={(item) => item.id} rowHrefPrefix="/accounting/payroll/" /></DataSurface>
  </ListPageLayout>;
}
