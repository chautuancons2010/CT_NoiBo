"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/shared/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Inspector, WorkbenchLayout, WorkCanvas } from "@/components/shared/Workbench";
import type { ApprovalCase } from "@/features/shared-platforms/types";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";

const domainLabels: Record<string, string> = { LEAVE: "Nghỉ phép", TIMESHEET_ADJUSTMENT: "Điều chỉnh công", WAREHOUSE: "Kho", IMPORT_EXPORT: "Xuất nhập khẩu" };
const statusLabels: Record<string, string> = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Đã từ chối", cancelled: "Đã hủy" };

function waitLabel(hours: number) {
  if (hours < 1) return "Mới gửi";
  if (hours < 24) return `Chờ ${hours} giờ`;
  return `Chờ ${Math.floor(hours / 24)} ngày`;
}

export function ApprovalCenter({ view }: { view: "pending" | "completed" | "delegated" }) {
  const [items, setItems] = useState<ApprovalCase[]>([]);
  const [selected, setSelected] = useState<ApprovalCase>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await fetch(`/api/v1/approvals?view=${view}`, { cache: "no-store" });
      const body = await response.json() as { data?: ApprovalCase[]; error?: { message: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Không thể tải yêu cầu.");
      const nextItems = body.data ?? [];
      setItems(nextItems);
      setSelected((current) => current ? nextItems.find((item) => item.id === current.id) : undefined);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải yêu cầu.");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [view]);

  const reconcile = useCallback(() => load(false), [load]);
  useEffect(() => { queueMicrotask(() => void load(true)); }, [load]);
  useDomainReconciliation("approvals", reconcile);

  if (loading) return <LoadingState title="Đang tải hàng đợi phê duyệt" description="" />;
  if (error && !items.length) return <ErrorState description={error} />;
  if (!items.length) return <EmptyState title={view === "pending" ? "Không có yêu cầu đang chờ" : "Chưa có yêu cầu"} />;

  return (
    <WorkbenchLayout className={selected ? "approval-queue" : "approval-queue workbench-layout--solo"}>
      <WorkCanvas className="approval-queue__canvas">
        <div className="approval-queue__status"><span>{items.length} yêu cầu</span>{refreshing ? <span role="status">Đang cập nhật…</span> : <span>Dữ liệu đã xác nhận</span>}</div>
        <div className="platform-table platform-table--approvals" role="table" aria-label="Yêu cầu phê duyệt">
          <div className="platform-table__head" role="row"><span>Loại yêu cầu</span><span>Mã tham chiếu</span><span>Người gửi</span><span>Đơn vị</span><span>Nội dung</span><span>Bước hiện tại</span><span>Thời gian chờ</span></div>
          {items.map((item) => <button className={`platform-table__row${selected?.id === item.id ? " is-selected" : ""}`} key={item.id} onClick={() => setSelected(item)} role="row" type="button">
            <span data-label="Loại yêu cầu">{domainLabels[item.domainType] ?? item.domainType}</span>
            <strong className="operational-code" data-label="Mã tham chiếu">{item.referenceNumber}</strong>
            <span data-label="Người gửi">{item.requesterName}</span><span data-label="Đơn vị">{item.organizationName ?? "—"}</span><span data-label="Nội dung">{item.summary}</span>
            <span data-label="Bước hiện tại">{item.currentStep ? `Bước ${item.currentStep}` : <StatusBadge tone={item.status === "approved" ? "success" : item.status === "rejected" ? "error" : "neutral"}>{statusLabels[item.status] ?? item.status}</StatusBadge>}</span>
            <time dateTime={item.submittedAt} data-label="Thời gian chờ">{item.status === "pending" ? waitLabel(item.waitingHours) : new Intl.DateTimeFormat("vi-VN").format(new Date(item.completedAt ?? item.submittedAt))}</time>
          </button>)}
        </div>
      </WorkCanvas>
      {selected ? <Inspector className="approval-queue__inspector" title="Ngữ cảnh quyết định">
        <div className="approval-inspector-heading"><span>{domainLabels[selected.domainType] ?? selected.domainType}</span><strong className="operational-code">{selected.referenceNumber}</strong><StatusBadge tone={selected.status === "approved" ? "success" : selected.status === "rejected" ? "error" : "warning"}>{statusLabels[selected.status] ?? selected.status}</StatusBadge></div>
        <dl className="approval-inspector-fields"><div><dt>Người gửi</dt><dd>{selected.requesterName}</dd></div><div><dt>Đơn vị</dt><dd>{selected.organizationName ?? "—"}</dd></div><div><dt>Nội dung</dt><dd>{selected.summary}</dd></div><div><dt>Thời gian chờ</dt><dd>{waitLabel(selected.waitingHours)}</dd></div><div><dt>Bước hiện tại</dt><dd>{selected.currentStep ?? "Đã hoàn tất"}</dd></div></dl>
        <div className="approval-inspector-actions"><Link className="button button--primary button--md" href={`/approvals/${selected.id}`}>Mở yêu cầu</Link><Button onClick={() => setSelected(undefined)}>Đóng</Button></div>
      </Inspector> : null}
    </WorkbenchLayout>
  );
}
