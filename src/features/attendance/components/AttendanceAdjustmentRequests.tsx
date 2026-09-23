"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { AttendanceAdjustmentRequest } from "@/features/attendance/services/adjustmentRequestService";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";

const requestLabels = { missing_check_in: "Quên chấm vào", missing_check_out: "Quên chấm ra" } as const;
const statusLabels = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối" } as const;

export function AttendanceAdjustmentRequests({ scope = "self", canReview = false, initialDate }: { scope?: "self" | "all"; canReview?: boolean; initialDate?: string }) {
  const [items, setItems] = useState<AttendanceAdjustmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(Boolean(initialDate));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await fetch(`/api/v1/attendance/adjustment-requests?scope=${scope}`, { cache: "no-store" });
    const body = await response.json() as { data?: AttendanceAdjustmentRequest[]; error?: { message: string } };
    if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải yêu cầu.");
    setItems(body.data);
    setError("");
    setLoading(false);
  }, [scope]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load().catch((reason: unknown) => { setError(reason instanceof Error ? reason.message : "Không thể tải yêu cầu."); setLoading(false); }), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useDomainReconciliation("attendance", load);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/attendance/adjustment-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attendanceDate: form.get("attendanceDate"), requestType: form.get("requestType"), requestedTime: form.get("requestedTime"), reason: form.get("reason") }) });
      const body = await response.json() as { error?: { message: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Không thể gửi yêu cầu.");
      setMessage("Đã gửi yêu cầu điều chỉnh công.");
      setShowForm(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể gửi yêu cầu.");
    } finally { setBusy(false); }
  }

  async function review(id: string, approve: boolean) {
    const note = approve ? "" : window.prompt("Lý do từ chối") ?? "";
    if (!approve && !note.trim()) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/attendance/adjustment-requests/${id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approve, note }) });
      const body = await response.json() as { error?: { message: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Không thể xử lý yêu cầu.");
      setMessage(approve ? "Đã duyệt và bổ sung lượt chấm công." : "Đã từ chối yêu cầu.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể xử lý yêu cầu.");
    } finally { setBusy(false); }
  }

  return <Card className="attendance-request-card">
    <div className="panel-header"><h2>{scope === "self" ? "Điều chỉnh công" : "Yêu cầu điều chỉnh công"}</h2>{scope === "self" ? <Button onClick={() => setShowForm((value) => !value)} size="sm" variant="primary">Tạo yêu cầu</Button> : null}</div>
    {showForm && scope === "self" ? <form className="attendance-request-form" onSubmit={(event) => void submit(event)}>
      <label>Ngày công<input className="input" defaultValue={initialDate} name="attendanceDate" required type="date" /></label>
      <label>Loại<select className="select" name="requestType"><option value="missing_check_out">Quên chấm ra</option><option value="missing_check_in">Quên chấm vào</option></select></label>
      <label>Giờ đề nghị<input className="input" name="requestedTime" required type="time" /></label>
      <label className="attendance-request-form__reason">Lý do<textarea className="textarea" minLength={5} name="reason" required rows={2} /></label>
      <Button disabled={busy} type="submit" variant="primary">Gửi yêu cầu</Button>
    </form> : null}
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {message ? <p className="form-success" role="status">{message}</p> : null}
    {loading ? <p>Đang tải…</p> : items.length ? <div className="attendance-request-list">{items.map((item) => <div className="attendance-request-list__item" key={item.id}>
      <div><strong>{item.employeeName !== "—" && scope === "all" ? `${item.employeeName} · ` : ""}{requestLabels[item.requestType]}</strong><span>{item.attendanceDate} · {item.requestedTime}</span><small>{item.reason}</small>{item.reviewNote ? <small>{item.reviewNote}</small> : null}</div>
      <StatusBadge status={item.status}>{statusLabels[item.status]}</StatusBadge>
      {scope === "all" && canReview && item.status === "pending" ? <div className="attendance-request-list__actions"><Button disabled={busy} onClick={() => void review(item.id, true)} size="sm" variant="primary">Duyệt</Button><Button disabled={busy} onClick={() => void review(item.id, false)} size="sm" variant="secondary">Từ chối</Button></div> : null}
    </div>)}</div> : <p>Chưa có yêu cầu điều chỉnh công.</p>}
  </Card>;
}
