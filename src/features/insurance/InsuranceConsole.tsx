"use client";

/* eslint-disable react-hooks/set-state-in-effect -- insurance state is loaded from the API. */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { Checkbox, Input, Select } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { DataSurface, ListPageLayout } from "@/components/shared/PageLayouts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatBusinessDate } from "@/lib/time/timezone";

type History = { id: string; changeType: string; effectiveDate: string; reason: string; changedByName: string; fileId?: string; fileName?: string };
type RecordItem = { employeeId: string; employeeCode: string; employeeName: string; socialInsuranceNumber: string; participationStatus: string; startDate?: string; contributionBase?: number; socialInsuranceEnabled: boolean; healthInsuranceEnabled: boolean; unemploymentInsuranceEnabled: boolean; history: History[] };
type Employee = { id: string; code: string; name: string };

const statusLabels: Record<string, string> = { active: "Đang tham gia", suspended: "Tạm ngừng", ended: "Đã giảm", not_participating: "Chưa tham gia" };
const changeLabels: Record<string, string> = { joined: "Tăng mới", adjusted: "Điều chỉnh", suspended: "Tạm ngừng", resumed: "Tiếp tục", ended: "Giảm lao động" };
const money = (value?: number) => value == null ? "—" : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

export function InsuranceConsole({ canEdit, canViewDocument, canUploadDocument }: { canEdit: boolean; canViewDocument: boolean; canUploadDocument: boolean }) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editing, setEditing] = useState<RecordItem>();
  const [history, setHistory] = useState<RecordItem>();
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
    const metadata = {
      employeeId: String(form.get("employeeId") || editing?.employeeId || ""),
      socialInsuranceNumber: String(form.get("socialInsuranceNumber")),
      participationStatus: String(form.get("participationStatus")),
      startDate: String(form.get("startDate") || "") || undefined,
      contributionBase: form.get("contributionBase") ? Number(form.get("contributionBase")) : undefined,
      socialInsuranceEnabled: form.get("socialInsuranceEnabled") === "on",
      healthInsuranceEnabled: form.get("healthInsuranceEnabled") === "on",
      unemploymentInsuranceEnabled: form.get("unemploymentInsuranceEnabled") === "on",
      changeType: String(form.get("changeType")),
      effectiveDate: String(form.get("effectiveDate")),
      reason: String(form.get("reason"))
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
    { id: "employee", header: "Nhân viên", cell: (item) => <><strong>{item.employeeName}</strong><br /><small>{item.employeeCode}</small></> },
    { id: "number", header: "Mã BHXH", accessor: "socialInsuranceNumber" },
    { id: "status", header: "Trạng thái", cell: (item) => <StatusBadge tone={item.participationStatus === "active" ? "success" : item.participationStatus === "suspended" ? "warning" : "neutral"}>{statusLabels[item.participationStatus]}</StatusBadge> },
    { id: "start", header: "Ngày bắt đầu", cell: (item) => item.startDate ? formatBusinessDate(item.startDate) : "—", hiddenOnMobile: true },
    { id: "base", header: "Mức căn cứ", cell: (item) => money(item.contributionBase), hiddenOnMobile: true },
    { id: "coverage", header: "Chế độ", cell: (item) => [item.socialInsuranceEnabled && "BHXH", item.healthInsuranceEnabled && "BHYT", item.unemploymentInsuranceEnabled && "BHTN"].filter(Boolean).join(" · ") || "—" }
  ], []);

  return (
    <ListPageLayout>
      <DataSurface>
        <div className="data-surface__toolbar panel-header"><h2>Hồ sơ bảo hiểm xã hội</h2>{canEdit ? <Button onClick={() => edit()} variant="primary">Ghi nhận biến động</Button> : null}</div>
        <DataTable
          actions={(item) => (
            <DropdownMenu label={`Thao tác hồ sơ ${item.employeeName}`}>
              <button onClick={() => setHistory(item)} type="button">Lịch sử</button>
              {canEdit ? <button onClick={() => edit(item)} type="button">Cập nhật</button> : null}
            </DropdownMenu>
          )}
          columns={columns}
          data={records}
          emptyDescription=""
          emptyTitle="Chưa có hồ sơ bảo hiểm"
          error={error}
          getRowId={(item) => item.employeeId}
        />
      </DataSurface>
      <Drawer onClose={() => setHistory(undefined)} open={Boolean(history)} title={`Lịch sử bảo hiểm · ${history?.employeeName ?? ""}`}>
        <ol className="salary-history-list">{history?.history.map((item) => <li key={item.id}><div><strong>{changeLabels[item.changeType] ?? item.changeType}</strong><span>{formatBusinessDate(item.effectiveDate)}</span></div><p>{item.reason}</p><small>{item.changedByName}</small>{canViewDocument && item.fileId ? <a className="text-link" href={`/api/v1/files/${item.fileId}/signed-url`} rel="noreferrer" target="_blank">{item.fileName}</a> : null}</li>)}</ol>
      </Drawer>
      <Drawer onClose={() => setOpen(false)} open={open} title="Ghi nhận biến động bảo hiểm">
        <form className="leave-form drawer-form" key={editing?.employeeId ?? "new"} onSubmit={submit}>
          <Select defaultValue={editing?.employeeId} disabled={Boolean(editing)} label="Nhân viên" name="employeeId" options={employees.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))} placeholder="Chọn nhân viên" required />
          <Input defaultValue={editing?.socialInsuranceNumber} label="Mã BHXH" name="socialInsuranceNumber" required />
          <Select defaultValue={editing?.participationStatus ?? "active"} label="Trạng thái" name="participationStatus" options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
          <Input defaultValue={editing?.startDate} label="Ngày bắt đầu" name="startDate" type="date" />
          <Input defaultValue={editing?.contributionBase} label="Mức căn cứ" min="0" name="contributionBase" type="number" />
          <fieldset className="insurance-options"><legend>Chế độ tham gia</legend><Checkbox defaultChecked={editing?.socialInsuranceEnabled ?? true} label="BHXH" name="socialInsuranceEnabled" /><Checkbox defaultChecked={editing?.healthInsuranceEnabled ?? true} label="BHYT" name="healthInsuranceEnabled" /><Checkbox defaultChecked={editing?.unemploymentInsuranceEnabled ?? true} label="BHTN" name="unemploymentInsuranceEnabled" /></fieldset>
          <Select defaultValue={editing ? "adjusted" : "joined"} label="Loại biến động" name="changeType" options={Object.entries(changeLabels).map(([value, label]) => ({ value, label }))} />
          <Input defaultValue={new Date().toISOString().slice(0, 10)} label="Ngày hiệu lực" name="effectiveDate" required type="date" />
          <Input label="Lý do" name="reason" required />
          {canUploadDocument ? <label>Tài liệu<input accept="application/pdf,image/jpeg,image/png,image/webp" className="input" name="file" type="file" /></label> : null}
          <div className="form-actions"><Button onClick={() => setOpen(false)} type="button">Hủy</Button><Button type="submit" variant="primary">Lưu biến động</Button></div>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      </Drawer>
    </ListPageLayout>
  );
}
