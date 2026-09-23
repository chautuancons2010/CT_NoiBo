"use client";

/* eslint-disable react-hooks/set-state-in-effect -- accounting data is loaded from the API. */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Banknote, Plus } from "lucide-react";

import { Button } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { FilterBar } from "@/components/shared/FilterBar";
import { Input, SearchInput, Select } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { DataSurface, ListPageLayout } from "@/components/shared/PageLayouts";
import { formatBusinessDate, formatBusinessDateTime } from "@/lib/time/timezone";
import type { SalaryRecord } from "../types";

type Person = { id: string; code: string; name: string };
const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

export function SalaryConsole({ canEdit, canViewHistory }: { canEdit: boolean; canViewHistory: boolean }) {
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [employees, setEmployees] = useState<Person[]>([]);
  const [selected, setSelected] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [historyEmployeeId, setHistoryEmployeeId] = useState<string>();
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/v1/accounting/salaries", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message);
    setRecords(body.data.records);
    setEmployees(body.data.employees);
  }, []);

  useEffect(() => { void load().catch((reason: Error) => setError(reason.message)); }, [load]);
  const latest = useMemo(() => {
    const seen = new Set<string>();
    return records.filter((item) => {
      if (seen.has(item.employeeId)) return false;
      seen.add(item.employeeId);
      return true;
    });
  }, [records]);
  const history = historyEmployeeId ? records.filter((item) => item.employeeId === historyEmployeeId) : [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/v1/accounting/salaries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ employeeId: selected, baseSalary: Number(form.get("baseSalary")), allowance: Number(form.get("allowance")), bonus: Number(form.get("bonus")), deduction: Number(form.get("deduction")), effectiveDate: form.get("effectiveDate"), note: form.get("note") || undefined, reason: form.get("reason") })
    });
    const body = await response.json();
    if (!response.ok) { setError(body.error?.message); return; }
    setError(""); formElement.reset(); setSelected(""); setDrawerOpen(false); await load();
  }

  const columns = useMemo<DataTableColumn<SalaryRecord>[]>(() => [
    { id: "employee", header: "Nhân viên", cell: (item) => <><strong>{item.employeeName}</strong><br /><small>{item.employeeCode}</small></> },
    { id: "effective", header: "Hiệu lực", cell: (item) => formatBusinessDate(item.effectiveDate) },
    { id: "salary", header: "Lương cơ bản", cell: (item) => money(item.baseSalary) },
    { id: "allowance", header: "Phụ cấp", cell: (item) => money(item.allowance), hiddenOnMobile: true },
    { id: "bonus", header: "Thưởng", cell: (item) => money(item.bonus), hiddenOnMobile: true },
    { id: "deduction", header: "Khấu trừ", cell: (item) => money(item.deduction), hiddenOnMobile: true }
  ], []);

  return (
    <ListPageLayout className="salary-console">
      <DataSurface className="salary-console__surface">
        <div className="data-surface__toolbar panel-header salary-console__toolbar">
          <div className="salary-console__heading">
            <span aria-hidden="true" className="salary-console__icon"><Banknote size={21} /></span>
            <div><h2>Hồ sơ lương hiện tại</h2><span>{latest.length} hồ sơ</span></div>
          </div>
          {canEdit ? <Button leftIcon={<Plus aria-hidden="true" size={18} />} onClick={() => setDrawerOpen(true)} size="lg" variant="primary">Ghi nhận mức lương</Button> : null}
        </div>
        <DataTable
          actions={canViewHistory ? (item) => <DropdownMenu label={`Thao tác lương ${item.employeeName}`}><button onClick={() => setHistoryEmployeeId(item.employeeId)} type="button">Lịch sử</button></DropdownMenu> : undefined}
          columns={columns}
          data={latest}
          emptyDescription=""
          emptyTitle="Chưa có hồ sơ lương"
          error={error}
          getRowId={(item) => item.id}
        />
      </DataSurface>
      <Drawer onClose={() => setHistoryEmployeeId(undefined)} open={Boolean(historyEmployeeId)} title={`Nhật ký lương · ${history[0]?.employeeName ?? ""}`}>
        <ol className="salary-history-list">{history.map((item, index) => <li key={item.id}><div><strong>{money(item.baseSalary)}</strong><span>{formatBusinessDate(item.effectiveDate)}</span></div><p>{item.reason}</p><small>{index + 1 < history.length ? `${money(history[index + 1].baseSalary)} → ${money(item.baseSalary)}` : "Mức lương đầu tiên"}</small></li>)}</ol>
      </Drawer>
      <Drawer onClose={() => setDrawerOpen(false)} open={drawerOpen} title="Ghi nhận mức lương">
        <form className="leave-form drawer-form" onSubmit={submit}>
          <Select label="Nhân viên" onChange={(event) => setSelected(event.target.value)} options={employees.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))} placeholder="Chọn nhân viên" required value={selected} />
          <Input label="Lương cơ bản" min="0" name="baseSalary" required type="number" />
          <Input defaultValue="0" label="Phụ cấp" min="0" name="allowance" required type="number" />
          <Input defaultValue="0" label="Thưởng" min="0" name="bonus" required type="number" />
          <Input defaultValue="0" label="Khấu trừ" min="0" name="deduction" required type="number" />
          <Input defaultValue={new Date().toISOString().slice(0, 10)} label="Hiệu lực từ" name="effectiveDate" required type="date" />
          <Input label="Lý do" name="reason" required />
          <Input label="Ghi chú" name="note" />
          <div className="form-actions"><Button onClick={() => setDrawerOpen(false)} type="button">Hủy</Button><Button type="submit" variant="primary">Lưu mức lương</Button></div>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      </Drawer>
    </ListPageLayout>
  );
}

export function SalaryHistoryConsole() {
  const [records, setRecords] = useState<SalaryRecord[]>();
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/v1/accounting/salaries", { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Không thể đọc nhật ký lương.");
      setRecords(body.data.records as SalaryRecord[]);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể đọc nhật ký lương."));
  }, []);
  const previous = useMemo(() => {
    const rows = records ?? [];
    const result = new Map<string, SalaryRecord>();
    const olderByEmployee = new Map<string, SalaryRecord>();
    for (let index = rows.length - 1; index >= 0; index--) {
      const row = rows[index];
      const older = olderByEmployee.get(row.employeeId);
      if (older) result.set(row.id, older);
      olderByEmployee.set(row.employeeId, row);
    }
    return result;
  }, [records]);
  const filtered = useMemo(() => (records ?? []).filter((row) => `${row.employeeCode} ${row.employeeName} ${row.reason}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))), [records, search]);
  const columns: DataTableColumn<SalaryRecord>[] = [
    { id: "employee", header: "Nhân viên", cell: (row) => <><strong>{row.employeeName}</strong><br /><small>{row.employeeCode}</small></> },
    { id: "effective", header: "Hiệu lực từ", cell: (row) => formatBusinessDate(row.effectiveDate) },
    { id: "base", header: "Lương cơ bản", cell: (row) => <>{previous.has(row.id) ? `${money(previous.get(row.id)!.baseSalary)} → ` : ""}{money(row.baseSalary)}</> },
    { id: "extras", header: "Phụ cấp / Thưởng / Khấu trừ", cell: (row) => `${money(row.allowance)} · ${money(row.bonus)} · ${money(row.deduction)}`, hiddenOnMobile: true },
    { id: "reason", header: "Lý do", accessor: "reason" },
    { id: "changed", header: "Ghi nhận", cell: (row) => <>{row.changedByName ?? "—"}<br /><small>{formatBusinessDateTime(row.changedAt)}</small></> }
  ];
  return <ListPageLayout><DataSurface><div className="data-surface__toolbar"><FilterBar><SearchInput onChange={(event) => setSearch(event.target.value)} placeholder="Nhân viên, mã, lý do" value={search} /></FilterBar></div><DataTable columns={columns} data={filtered} emptyDescription="" emptyTitle="Chưa có thay đổi lương" error={error} getRowId={(row) => row.id} loading={!records && !error} /></DataSurface></ListPageLayout>;
}
