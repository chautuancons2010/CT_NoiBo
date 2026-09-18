"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { Input } from "@/components/shared/FormControls";
import { DataSurface, PageContainer } from "@/components/shared/PageLayouts";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";
import { ShiftAssignmentForm } from "./ShiftAssignmentForm";
import type { Shift } from "../types/timesheetTypes";

type ShiftVersion = { id: string; shift_id: string; version: number; name: string; start_time: string; end_time: string; effective_from: string; effective_to?: string | null; reason: string };

export function ShiftSettings({ canEdit = false }: { canEdit?: boolean }) {
  const [items, setItems] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<Record<string, unknown>[]>([]);
  const [versions, setVersions] = useState<ShiftVersion[]>([]);
  const [editing, setEditing] = useState<Shift>();
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/v1/shifts", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message);
    setItems(body.data.shifts); setAssignments(body.data.assignments); setVersions(body.data.versions ?? []);
  }, []);
  useEffect(() => { queueMicrotask(() => void load().catch((reason) => setError(reason.message))); }, [load]);
  useDomainReconciliation("timesheets", load);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const payload = { id: editing?.id, code: form.get("code"), name: form.get("name"), startTime: form.get("startTime"), endTime: form.get("endTime"), breakMinutes: Number(form.get("breakMinutes")), lateGraceMinutes: Number(form.get("lateGraceMinutes")), earlyLeaveGraceMinutes: Number(form.get("earlyLeaveGraceMinutes")), checkInEarliestMinutes: editing?.checkInEarliestMinutes ?? 120, checkInLatestMinutes: editing?.checkInLatestMinutes ?? 240, checkOutEarliestMinutes: editing?.checkOutEarliestMinutes ?? 0, checkOutLatestMinutes: editing?.checkOutLatestMinutes ?? 360, crossMidnight: form.get("crossMidnight") === "on", active: true, effectiveFrom: editing ? form.get("effectiveFrom") : undefined, reason: editing ? form.get("reason") : undefined };
    const response = await fetch("/api/v1/shifts", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); const body = await response.json();
    if (!response.ok) { setError(body.error?.message ?? "Không thể lưu ca làm."); return; }
    setError(""); setEditing(undefined); event.currentTarget.reset(); await load();
  }

  const shiftColumns: DataTableColumn<Shift>[] = [
    { id: "code", header: "Mã", accessor: "code" }, { id: "name", header: "Tên", accessor: "name" },
    { id: "hours", header: "Giờ làm", cell: (item) => `${item.startTime} – ${item.endTime}${item.crossMidnight ? " (+1)" : ""}` },
    { id: "break", header: "Nghỉ", cell: (item) => `${item.breakMinutes}'`, hiddenOnMobile: true },
    { id: "late", header: "Đi trễ", cell: (item) => `${item.lateGraceMinutes}'`, hiddenOnMobile: true },
    { id: "early", header: "Về sớm", cell: (item) => `${item.earlyLeaveGraceMinutes}'`, hiddenOnMobile: true }
  ];
  const versionColumns: DataTableColumn<ShiftVersion>[] = [
    { id: "shift", header: "Ca", accessor: "name" }, { id: "version", header: "Phiên bản", cell: (item) => `v${item.version}` },
    { id: "hours", header: "Giờ làm", cell: (item) => `${item.start_time.slice(0, 5)} – ${item.end_time.slice(0, 5)}` },
    { id: "effective", header: "Hiệu lực", cell: (item) => `${item.effective_from} → ${item.effective_to ?? "Hiện tại"}` },
    { id: "reason", header: "Lý do", accessor: "reason", hiddenOnMobile: true }
  ];

  return <PageContainer>
    <div className="content-grid content-grid--two">
      <DataSurface><header className="data-surface__toolbar"><h3 className="section-title">Ca làm</h3></header><DataTable actions={canEdit?(item)=><DropdownMenu label={`Thao tác ca ${item.name}`}><button onClick={()=>setEditing(item)} type="button">Sửa</button></DropdownMenu>:undefined} columns={shiftColumns} data={items} emptyDescription="" emptyTitle="Chưa có ca làm" getRowId={(item)=>item.id}/><div className="data-surface__toolbar"><h3 className="section-title timesheet-section-gap">Gán ca</h3><div className="compact-list">{assignments.map((item) => <div key={String(item.id)}><span>{String(item.scope_type)}</span><strong>{items.find((shift) => shift.id === item.shift_id)?.name}</strong><span>{String(item.effective_from)}</span></div>)}</div></div></DataSurface>
      {canEdit ? <Card><div className="panel-header"><h3 className="section-title">{editing ? "Tạo phiên bản ca" : "Thêm ca"}</h3>{editing ? <Button onClick={() => setEditing(undefined)}>Hủy sửa</Button> : null}</div><form className="leave-form" key={editing?.id ?? "new"} onSubmit={submit}><div className="form-grid"><Input defaultValue={editing?.code} label="Mã ca" name="code" required /><Input defaultValue={editing?.name} label="Tên ca" name="name" required /><Input defaultValue={editing?.startTime} label="Bắt đầu" name="startTime" required type="time" /><Input defaultValue={editing?.endTime} label="Kết thúc" name="endTime" required type="time" /><Input defaultValue={editing?.breakMinutes ?? 60} label="Nghỉ giữa ca" min="0" name="breakMinutes" required type="number" /><Input defaultValue={editing?.lateGraceMinutes ?? 5} label="Cho phép đi trễ" min="0" name="lateGraceMinutes" required type="number" /><Input defaultValue={editing?.earlyLeaveGraceMinutes ?? 5} label="Cho phép về sớm" min="0" name="earlyLeaveGraceMinutes" required type="number" />{editing ? <Input defaultValue={new Date().toISOString().slice(0, 10)} label="Áp dụng từ" name="effectiveFrom" required type="date" /> : null}{editing ? <Input label="Lý do thay đổi" name="reason" required /> : null}<label className="choice-field"><input className="checkbox" defaultChecked={editing?.crossMidnight} name="crossMidnight" type="checkbox" />Qua ngày</label></div><div className="form-actions"><Button type="submit" variant="primary">{editing ? "Lưu phiên bản" : "Lưu ca"}</Button></div>{error ? <p className="form-error">{error}</p> : null}</form></Card> : null}
    </div>
    <DataSurface><header className="data-surface__toolbar"><h3 className="section-title">Lịch sử phiên bản</h3></header><DataTable columns={versionColumns} data={versions} emptyDescription="" emptyTitle="Chưa có phiên bản" getRowId={(item)=>item.id}/></DataSurface>
    {canEdit ? <ShiftAssignmentForm onAssigned={() => void load().catch((reason) => setError(reason.message))} shifts={items} /> : null}
  </PageContainer>;
}
