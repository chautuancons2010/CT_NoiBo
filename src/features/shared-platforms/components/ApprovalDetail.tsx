"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/shared/Button";
import { Input, Textarea } from "@/components/shared/FormControls";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Inspector, WorkbenchLayout, WorkCanvas } from "@/components/shared/Workbench";
import type { ApprovalCase } from "@/features/shared-platforms/types";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";

const domainLabels: Record<string, string> = { LEAVE: "Nghỉ phép", TIMESHEET_ADJUSTMENT: "Điều chỉnh công", WAREHOUSE: "Kho", IMPORT_EXPORT: "Xuất nhập khẩu" };
const statusLabels: Record<string, string> = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Đã từ chối", skipped: "Bỏ qua", cancelled: "Đã hủy" };

export function ApprovalDetail({ id }: { id: string }) {
  const [item, setItem] = useState<ApprovalCase>();
  const [comment, setComment] = useState("");
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/v1/approvals/${id}`, { cache: "no-store" });
    const body = await response.json() as { data?: ApprovalCase; error?: { message: string } };
    setItem(body.data);
    setError(response.ok ? "" : body.error?.message ?? "Không thể tải yêu cầu.");
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  useDomainReconciliation("approvals", load);

  async function act(action: "approve" | "reject") {
    setBusy(true);
    const response = await fetch(`/api/v1/approvals/${id}/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ comment: comment || undefined }) });
    const body = await response.json() as { error?: { message: string } };
    setError(response.ok ? "" : body.error?.message ?? "Không thể xử lý.");
    if (response.ok) await load();
    setBusy(false);
  }

  async function reassign() {
    setBusy(true);
    const response = await fetch(`/api/v1/approvals/${id}/reassign`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toAccountId: target, reason }) });
    const body = await response.json() as { error?: { message: string } };
    setError(response.ok ? "" : body.error?.message ?? "Không thể chuyển người duyệt.");
    if (response.ok) { setTarget(""); setReason(""); await load(); }
    setBusy(false);
  }

  if (!item && !error) return <LoadingState title="Đang tải yêu cầu" description="" />;
  if (!item) return <ErrorState description={error} />;

  return (
    <WorkbenchLayout className={item.status === "pending" ? "approval-decision" : "approval-decision workbench-layout--solo"}>
      <WorkCanvas className="approval-decision__canvas">
        <header className="approval-decision__heading">
          <div><span>{domainLabels[item.domainType] ?? item.domainType}</span><h1 className="operational-code">{item.referenceNumber}</h1></div>
          <StatusBadge tone={item.status === "approved" ? "success" : item.status === "rejected" ? "error" : "warning"}>{statusLabels[item.status] ?? item.status}</StatusBadge>
        </header>
        <section className="approval-decision__context" aria-labelledby="approval-context-title">
          <h2 id="approval-context-title">Căn cứ quyết định</h2>
          <dl className="detail-list"><div><dt>Người tạo</dt><dd>{item.requesterName}</dd></div><div><dt>Thời gian tạo</dt><dd>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.submittedAt))}</dd></div><div><dt>Nội dung</dt><dd>{item.summary}</dd></div><div><dt>Quy trình</dt><dd>Phiên bản {item.workflowVersion}</dd></div></dl>
          <Link className="button button--secondary button--md" href={item.domainLink}>Mở hồ sơ nghiệp vụ</Link>
        </section>
        <section className="approval-decision__timeline" aria-labelledby="approval-timeline-title">
          <h2 id="approval-timeline-title">Tiến trình phê duyệt</h2>
          <ol className="approval-timeline">{item.steps.map((step) => <li className={`is-${step.status}`} key={step.id}><span>{step.stepOrder}</span><div><strong>{step.stepName}</strong><p>{step.approverName ?? "Chưa xác định người duyệt"}</p>{step.actedAt ? <time dateTime={step.actedAt}>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(step.actedAt))}</time> : null}{step.comment ? <blockquote>{step.comment}</blockquote> : null}</div><StatusBadge tone={step.status === "approved" ? "success" : step.status === "rejected" ? "error" : "warning"}>{statusLabels[step.status] ?? step.status}</StatusBadge></li>)}</ol>
        </section>
      </WorkCanvas>
      {item.status === "pending" ? <Inspector className="approval-decision__inspector" title="Quyết định">
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <Textarea label="Ý kiến" value={comment} onChange={(event) => setComment(event.target.value)} />
        <div className="approval-decision__actions"><Button disabled={busy} onClick={() => void act("approve")} variant="primary">Duyệt yêu cầu</Button><Button disabled={busy} onClick={() => void act("reject")} variant="danger">Từ chối</Button></div>
        <details className="reassign-panel"><summary>Chuyển người duyệt</summary><div className="form-grid"><Input label="Mã tài khoản nhận" value={target} onChange={(event) => setTarget(event.target.value)} /><Input label="Lý do" value={reason} onChange={(event) => setReason(event.target.value)} /></div><Button disabled={busy || !target || reason.length < 3} onClick={() => void reassign()}>Xác nhận chuyển</Button></details>
      </Inspector> : null}
    </WorkbenchLayout>
  );
}
