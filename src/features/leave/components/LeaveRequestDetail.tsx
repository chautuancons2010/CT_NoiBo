"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { Textarea } from "@/components/shared/FormControls";
import { ErrorState, LoadingState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { LeaveApprovalStep, LeaveRequest } from "@/features/leave/types/leaveTypes";
import { formatBusinessDate } from "@/lib/time/timezone";
import { useMobileViewport } from "@/lib/ui/useMobileViewport";
import { can } from "@/lib/auth/permissions";
import styles from "./LeaveRequestDetail.module.css";

function hasDisplayValue(value?: string) {
  return Boolean(value?.trim() && !["—", "-"].includes(value.trim()));
}

const stepStatusLabel: Record<LeaveApprovalStep["status"], string> = {
  pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối", skipped: "Bỏ qua", cancelled: "Đã hủy"
};

export function LeaveRequestDetail({ id }: { id: string }) {
  const router = useRouter();
  const user = useCurrentUser();
  const mobile = useMobileViewport();
  const selfScope = mobile === true;
  const requestKey = `${id}:${selfScope}`;
  const requestId = useRef(0);
  const [loaded, setLoaded] = useState<{ key: string; item: LeaveRequest }>();
  const [comment, setComment] = useState("");
  const [failure, setFailure] = useState<{ key: string; message: string }>();
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    if (mobile === null) return;
    const currentRequest = ++requestId.current;
    setFailure(undefined);
    try {
      const response = await fetch(`/api/v1/leave-requests/${id}${selfScope ? "?scope=self" : ""}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Không thể tải đơn nghỉ.");
      if (currentRequest === requestId.current) setLoaded({ key: requestKey, item: body.data });
    } catch (reason) {
      if (currentRequest === requestId.current) setFailure({ key: requestKey, message: reason instanceof Error ? reason.message : "Không thể tải đơn nghỉ." });
    }
  }, [id, mobile, requestKey, selfScope]);

  useEffect(() => { void load(); }, [load]);

  async function action(name: string, payload: object) {
    setActionError("");
    try {
      const response = await fetch(`/api/v1/leave-requests/${id}/${name}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Không thể xử lý đơn nghỉ.");
      setLoaded({ key: requestKey, item: body.data });
      router.refresh();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Không thể xử lý đơn nghỉ.");
    }
  }

  if (failure?.key === requestKey) return <ErrorState action={<Button onClick={() => void load()}>Thử lại</Button>} description={failure.message} title="Không thể tải đơn nghỉ" />;
  if (!loaded || loaded.key !== requestKey) return <LoadingState title="Đang tải đơn nghỉ" />;

  const item = loaded.item;
  const pending = ["submitted", "pending_approval"].includes(item.status);
  const pendingStep = item.approvalSteps.find((step) => step.status === "pending");
  const canApprove = !selfScope && Boolean(pendingStep) && (can(user.permissions, "leave.approve_all") ||
    can(user.permissions, "leave.approve") && pendingStep?.approverAccountId === user.id);
  const statusLabel: Record<LeaveRequest["status"], string> = {
    draft: "Nháp", submitted: "Đã gửi", pending_approval: "Chờ duyệt", approved: "Đã duyệt",
    rejected: "Từ chối", withdrawn: "Đã thu hồi", cancelled: "Đã hủy"
  };

  const dates = item.startDate === item.endDate
    ? formatBusinessDate(item.startDate)
    : `${formatBusinessDate(item.startDate)} – ${formatBusinessDate(item.endDate)}`;

  return <div className={`leave-detail-grid ${styles.layout}`}>
    <Card className={styles.requestCard}>
      <div className={styles.heading}><h2>{item.leaveTypeName}</h2><StatusBadge tone={item.status === "approved" ? "success" : item.status === "rejected" ? "error" : pending ? "warning" : "neutral"}>{statusLabel[item.status]}</StatusBadge></div>
      <dl className={styles.facts}>
        {!selfScope && hasDisplayValue(item.employeeName) ? <div><dt>Nhân viên</dt><dd>{item.employeeName}</dd></div> : null}
        {!selfScope && hasDisplayValue(item.departmentName) ? <div><dt>Phòng ban</dt><dd>{item.departmentName}</dd></div> : null}
        <div className={styles.period}><dt>Thời gian nghỉ</dt><dd><strong>{dates}</strong><span>{new Intl.NumberFormat("vi-VN").format(item.calculatedDays)} ngày</span></dd></div>
        {hasDisplayValue(item.reason) ? <div className={styles.reason}><dt>Lý do</dt><dd>{item.reason}</dd></div> : null}
      </dl>
      {item.warnings.map((value) => <p className="form-warning" key={value}>{value}</p>)}
      {item.attachments.length ? <div className="leave-attachments"><strong>Tài liệu</strong>{item.attachments.map((file) => <a href={`/api/v1/leave-requests/${id}/attachments/${file.id}`} key={file.id} rel="noreferrer" target="_blank">{file.fileName}</a>)}</div> : null}
      <div className={styles.actions}>
        <a className="button button--secondary button--md" href={`/api/v1/leave-requests/${id}/pdf`}>Xuất PDF</a>
        {item.status === "draft" ? <Button onClick={() => void action("submit", { version: item.version })} variant="primary">Gửi duyệt</Button> : null}
        {pending ? <Button onClick={() => void action("withdraw", { version: item.version })}>Thu hồi</Button> : null}
        {item.status === "approved" ? <Button onClick={() => void action("cancel", { version: item.version, reason: comment || "Hủy theo yêu cầu" })} variant="danger">Hủy đơn</Button> : null}
      </div>
      {actionError ? <p className="form-error" role="alert">{actionError}</p> : null}
    </Card>
    {item.approvalSteps.length ? <Card className={styles.approvalCard}>
      <h2>Phê duyệt</h2>
      <ol className={styles.timeline}>
        {item.approvalSteps.map((step) => <li key={step.id}><strong>{step.approverName ?? `Bước ${step.stepOrder}`}</strong><StatusBadge tone={step.status === "approved" ? "success" : step.status === "rejected" ? "error" : step.status === "pending" ? "warning" : "neutral"}>{stepStatusLabel[step.status]}</StatusBadge>{step.comment ? <span className={styles.stepComment}>{step.comment}</span> : null}</li>)}
      </ol>
      {pending && canApprove ? <div className={styles.decision}><Textarea label="Ý kiến" onChange={(event) => setComment(event.target.value)} rows={3} value={comment} /><div className={styles.actions}><Button onClick={() => void action("reject", { version: item.version, comment })} variant="danger">Từ chối</Button><Button onClick={() => void action("approve", { version: item.version, comment })} variant="primary">Duyệt</Button></div></div> : null}
    </Card> : null}
  </div>;
}
