"use client";

/* eslint-disable react-hooks/set-state-in-effect -- insurance state is loaded from the API. */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { Input, Select } from "@/components/shared/FormControls";
import { Modal } from "@/components/shared/Overlays";
import { DataSurface, ListPageLayout } from "@/components/shared/PageLayouts";
import { getBusinessDateKey } from "@/lib/time/timezone";

type RecordItem = { employeeId: string; employeeCode: string; employeeName: string; socialInsuranceNumber: string; participationStatus: string; startDate?: string; contributionBase?: number; socialInsuranceEnabled: boolean; healthInsuranceEnabled: boolean; unemploymentInsuranceEnabled: boolean };
type Employee = { id: string; code: string; name: string };

export function InsuranceConsole({ canEdit }: { canEdit: boolean }) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editing, setEditing] = useState<RecordItem>();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/v1/insurance", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message);
    setRecords(body.data.records ?? []);
    setEmployees(body.data.employees ?? []);
  }, []);

  useEffect(() => { void load().catch((reason: Error) => setError(reason.message)); }, [load]);
  function edit(item?: RecordItem) { setEditing(item); setOpen(true); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const isExistingRecord = Boolean(editing);
    const metadata = {
      employeeId: String(form.get("employeeId") || editing?.employeeId || ""),
      socialInsuranceNumber: String(form.get("socialInsuranceNumber")),
      participationStatus: editing?.participationStatus ?? "active",
      startDate: editing?.startDate,
      contributionBase: editing?.contributionBase,
      socialInsuranceEnabled: editing?.socialInsuranceEnabled ?? true,
      healthInsuranceEnabled: editing?.healthInsuranceEnabled ?? true,
      unemploymentInsuranceEnabled: editing?.unemploymentInsuranceEnabled ?? true,
      changeType: isExistingRecord ? "adjusted" : "joined",
      effectiveDate: getBusinessDateKey(),
      reason: isExistingRecord ? "Cập nhật mã số BHXH" : "Thêm mã số BHXH"
    };
    const payload = new FormData();
    payload.set("metadata", JSON.stringify(metadata));
    const file = form.get("file");
    if (file instanceof File && file.size) payload.set("file", file);
    const response = await fetch("/api/v1/insurance", { method: "POST", body: payload });
    const body = await response.json();
    if (!response.ok) { setError(body.error?.message); return; }
    setError(""); setOpen(false); setEditing(undefined); await load();
  }

  const columns = useMemo<DataTableColumn<RecordItem>[]>(() => [
    { id: "employee", header: "Nhân viên", cell: (item) => <strong>{item.employeeName}</strong> },
    { id: "number", header: "Mã số BHXH", accessor: "socialInsuranceNumber" }
  ], []);

  return (
    <ListPageLayout>
      <DataSurface>
        <div className="data-surface__toolbar panel-header"><h2>Thông tin BHXH</h2>{canEdit ? <Button onClick={() => edit()} variant="primary">Thêm thông tin</Button> : null}</div>
        <DataTable
          actions={canEdit ? (item) => (
            <DropdownMenu label={`Thao tác hồ sơ ${item.employeeName}`}>
              <button onClick={() => edit(item)} type="button">Cập nhật</button>
            </DropdownMenu>
          ) : undefined}
          columns={columns}
          data={records}
          emptyDescription=""
          emptyTitle="Chưa có hồ sơ bảo hiểm"
          error={error}
          getRowId={(item) => item.employeeId}
        />
      </DataSurface>
      <Modal onClose={() => setOpen(false)} open={open} title={editing ? "Cập nhật thông tin BHXH" : "Thêm thông tin BHXH"}>
        <form className="leave-form drawer-form" key={editing?.employeeId ?? "new"} onSubmit={submit}>
          <Select defaultValue={editing?.employeeId} disabled={Boolean(editing)} label="Nhân viên" name="employeeId" options={employees.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))} placeholder="Chọn nhân viên" required />
          <Input defaultValue={editing?.socialInsuranceNumber} label="Mã số BHXH" name="socialInsuranceNumber" required />
          <div className="form-actions"><Button onClick={() => setOpen(false)} type="button">Hủy</Button><Button type="submit" variant="primary">Lưu thông tin</Button></div>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      </Modal>
    </ListPageLayout>
  );
}
