"use client";

import { Select } from "@/components/shared/FormControls";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/shared/Card";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DataSurface, FormPageLayout } from "@/components/shared/PageLayouts";
import type { TimesheetAdjustment } from "../types/timesheetTypes";

const adjustmentLabels: Record<string, string> = {
  add_missing_check_in: "Bổ sung chấm vào",
  add_missing_check_out: "Bổ sung chấm ra",
  adjust_effective_time: "Sửa thời gian hiệu lực",
  mark_leave: "Đánh dấu nghỉ",
  mark_business_trip: "Đánh dấu công tác",
  correct_status: "Sửa trạng thái",
  correct_work_fraction: "Sửa ngày công",
  note_only: "Chỉ ghi chú",
  other: "Khác"
};

export function TimesheetAdjustmentForm({ defaults }: {
  defaults: { periodId?: string; employeeId?: string; date?: string; rowVersion?: string };
}) {
  const [history, setHistory] = useState<TimesheetAdjustment[]>([]);
  const [message, setMessage] = useState("");

  const loadHistory = useCallback(async (periodId: string, employeeId?: string, date?: string) => {
    const query = new URLSearchParams();
    if (employeeId) query.set("employeeId", employeeId);
    if (date) query.set("date", date);
    const response = await fetch(`/api/v1/timesheet-periods/${periodId}/adjustments?${query}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message);
    setHistory(body.data ?? []);
  }, []);

  useEffect(() => {
    if (!defaults.periodId) return;
    const timer = window.setTimeout(() => {
      void loadHistory(defaults.periodId!, defaults.employeeId, defaults.date).catch((error: Error) => setMessage(error.message));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [defaults.date, defaults.employeeId, defaults.periodId, loadHistory]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const periodId = String(form.get("periodId"));
    const employeeId = String(form.get("employeeId"));
    const workDate = String(form.get("workDate"));
    const payload = {
      employeeId,
      workDate,
      adjustmentType: form.get("adjustmentType"),
      effectiveTime: form.get("effectiveTime") ? new Date(String(form.get("effectiveTime"))).toISOString() : undefined,
      correctedStatus: form.get("correctedStatus") || undefined,
      correctedWorkFraction: form.get("correctedWorkFraction") ? Number(form.get("correctedWorkFraction")) : undefined,
      hrNote: form.get("hrNote") || undefined,
      reason: form.get("reason"),
      rowVersion: Number(form.get("rowVersion"))
    };
    const response = await fetch(`/api/v1/timesheet-periods/${periodId}/adjustments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    setMessage(response.ok ? "Đã lưu điều chỉnh." : body.error?.message);
    if (response.ok) await loadHistory(periodId, employeeId, workDate);
  }

  const columns: DataTableColumn<TimesheetAdjustment>[] = [
    { id: "created", header: "Thời gian", cell: (item) => new Date(item.createdAt).toLocaleString("vi-VN") },
    { id: "date", header: "Ngày công", cell: (item) => new Date(`${item.workDate}T00:00:00`).toLocaleDateString("vi-VN") },
    { id: "type", header: "Loại", cell: (item) => adjustmentLabels[item.adjustmentType] ?? item.adjustmentType },
    { id: "reason", header: "Lý do", accessor: "reason" },
    { id: "note", header: "Ghi chú HR", cell: (item) => item.hrNote ?? "—", hiddenOnMobile: true }
  ];

  return <FormPageLayout>
    <Card><form className="leave-form" onSubmit={submit}>
      <div className="form-grid">
        <label>ID kỳ công<input className="input" name="periodId" defaultValue={defaults.periodId} required /></label>
        <label>Phiên bản dòng<input className="input" name="rowVersion" type="number" defaultValue={defaults.rowVersion} required /></label>
        <label>ID nhân viên<input className="input" name="employeeId" defaultValue={defaults.employeeId} required /></label>
        <label>Ngày<input className="input" name="workDate" type="date" defaultValue={defaults.date} required /></label>
        <Select label={"Loại"} className="select" name="adjustmentType" options={[...(Object.entries(adjustmentLabels).map(([value, label]) => ({ label: label, value: value })))]} />
        <label>Thời gian hiệu lực<input className="input" name="effectiveTime" type="datetime-local" /></label>
        <Select label={"Trạng thái"} className="select" name="correctedStatus" options={[{ label: "Không đổi", value: "" }, { label: "Đủ công", value: "full_work" }, { label: "Phép năm", value: "annual_leave" }, { label: "Nghỉ không lương", value: "unpaid_leave" }, { label: "Công tác", value: "business_trip" }, { label: "Vắng", value: "absent" }]} />
        <label>Ngày công<input className="input" name="correctedWorkFraction" type="number" min="0" max="1" step="0.5" /></label>
      </div>
      <label>Ghi chú HR<textarea className="textarea" name="hrNote" /></label>
      <label>Lý do<textarea className="textarea" name="reason" required /></label>
      <div className="form-actions"><button className="button button--primary">Lưu điều chỉnh</button></div>
      {message ? <p className="save-feedback">{message}</p> : null}
    </form></Card>
    <DataSurface><header className="data-surface__toolbar"><h3 className="section-title">Lịch sử điều chỉnh</h3></header><DataTable columns={columns} data={history} emptyDescription="" emptyTitle="Chưa có điều chỉnh" getRowId={(item) => item.id} /></DataSurface>
  </FormPageLayout>;
}
