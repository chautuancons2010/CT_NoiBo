"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, ArrowUpRight, ChevronDown, ClipboardCheck, Plus, Repeat2 } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { FilterTabs } from "@/components/shared/FilterBar";
import { ListWorkspace, SecondarySection, WorkspaceMetrics } from "@/components/shared/PageLayouts";
import { EmptyState, LoadingState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useWarehouseResource } from "../client/useWarehouseResource";
import type { WarehouseDashboard } from "../types/warehouseTypes";
import styles from "./WarehouseUi.module.css";

const paths = { receipt: "receipts", issue: "issues", transfer: "transfers", adjustment: "adjustments", reversal: "ledger" };
const labels = { receipt: "Nhập kho", issue: "Xuất kho", transfer: "Chuyển kho", adjustment: "Điều chỉnh", reversal: "Đảo chứng từ" };
const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 4 });
const actionConfig = {
  receipt: { label: "Nhập kho", href: "/warehouse/receipts/new", Icon: ArrowDownToLine },
  issue: { label: "Xuất kho", href: "/warehouse/issues/new", Icon: ArrowUpFromLine },
  transfer: { label: "Chuyển kho", href: "/warehouse/transfers/new", Icon: Repeat2 },
  count: { label: "Tạo kiểm kê", href: "/warehouse/stock-counts/new", Icon: ClipboardCheck }
};
type WarehouseAction = keyof typeof actionConfig;

export function WarehouseCreateActions({ actions }: { actions: WarehouseAction[] }) {
  if (!actions.length) return null;
  return <DropdownMenu label="Tạo phiếu kho" variant="primary" trigger={<><Plus aria-hidden="true" size={17} />Tạo phiếu<ChevronDown aria-hidden="true" size={16} /></>}>
    {actions.map(action => { const item = actionConfig[action]; return <Link href={item.href} key={action}><item.Icon aria-hidden="true" size={16} />{item.label}</Link>; })}
  </DropdownMenu>;
}

export function WarehouseOverview({ actions }: { actions: WarehouseAction[] }) {
  const [view, setView] = useState("pending");
  const result = useWarehouseResource<WarehouseDashboard>("/api/v1/warehouse/dashboard");
  const data = result.data;
  if (!data) return result.error
    ? <div className={styles.formCard}><p className="form-error" role="alert">{result.error}</p><Button onClick={() => void result.reload()}>Tải lại</Button></div>
    : <LoadingState title="Đang mở kho vật tư" />;
  const openCounts = data.pendingStockCounts ?? [];
  return <div className="page-stack">
    <ListWorkspace label="Công việc trong kho"
      navigation={<FilterTabs label="Công việc trong kho" value={view} onChange={setView} options={[{ value: "pending", label: `Chờ ghi sổ ${data.pendingDocuments}` }, { value: "stock", label: `Cần bổ sung ${data.lowStock + data.outOfStock}` }, ...(actions.includes("count") || openCounts.length ? [{ value: "counts", label: `Kiểm kê ${openCounts.length}` }] : [])]} />}
      summary={<WorkspaceMetrics items={[{ label: "Kho đang quản lý", value: data.warehouseCount }, { label: "Sắp hết", value: data.lowStock, tone: data.lowStock ? "warning" : undefined }, { label: "Hết hàng", value: data.outOfStock, tone: data.outOfStock ? "error" : undefined }]} />}>
      {view === "pending" ? <div className={styles.recordList}>
        {(data.pendingDocumentItems ?? []).map(row => <Link className={styles.recordRow} href={`/warehouse/${paths[row.type]}/${row.id}`} key={row.id}><span><strong>{row.documentNumber}</strong><small>{labels[row.type]} · {row.sourceWarehouseName ?? row.targetWarehouseName} · {row.lineCount} mặt hàng</small></span><StatusBadge tone="warning">{row.status === "submitted" ? "Đã gửi" : "Nháp"}</StatusBadge></Link>)}
        {!data.pendingDocuments ? <EmptyState title="Đã xử lý hết chứng từ" /> : null}
      </div> : view === "stock" ? <div className={styles.recordList}>
        {data.lowStockItems.map(row => <Link className={styles.recordRow} href={`/warehouse/inventory?warehouseId=${row.warehouseId}&itemId=${row.itemId}`} key={`${row.warehouseId}:${row.itemId}`}><span><strong>{row.itemName}</strong><small>{row.itemCode} · {row.warehouseName}</small></span><StatusBadge tone={row.status === "out_of_stock" ? "error" : "warning"}>{number.format(row.onHand)} {row.uomCode}</StatusBadge></Link>)}
        {!data.lowStockItems.length ? <EmptyState title="Không có cảnh báo tồn kho" /> : null}
        <Link className={styles.recordRow} href="/warehouse/inventory?status=low_stock">Xem tồn kho<ArrowUpRight aria-hidden="true" size={16} /></Link>
      </div> : <div className={styles.recordList}>
        {openCounts.map(row => <Link className={styles.recordRow} href={`/warehouse/stock-counts/${row.id}`} key={row.id}><span><strong>{row.countNumber}</strong><small>{row.warehouseName} · {row.transactionPolicy === "freeze" ? "Đang khóa giao dịch" : "Đối chiếu phát sinh"}</small></span><StatusBadge tone="warning">{row.status === "reviewed" ? "Chờ ghi sổ" : "Đang kiểm"}</StatusBadge></Link>)}
        {!openCounts.length ? <EmptyState title="Không có kiểm kê đang mở" /> : null}
        <Link className={styles.recordRow} href="/warehouse/stock-counts">Danh sách kiểm kê<ArrowUpRight aria-hidden="true" size={16} /></Link>
      </div>}
    </ListWorkspace>
    <SecondarySection title="Giao dịch gần đây" count={data.recentDocuments.length}>
      <div className={styles.recordList}>{data.recentDocuments.map(row => <Link className={styles.recordRow} href={`/warehouse/${paths[row.type]}/${row.id}`} key={row.id}><span><strong>{row.documentNumber}</strong><small>{labels[row.type]} · {row.documentDate.split("-").reverse().join("/")} · {row.targetWarehouseName ?? row.sourceWarehouseName}</small></span><StatusBadge tone={row.status === "posted" ? "success" : "neutral"}>{row.status === "posted" ? "Đã ghi sổ" : row.status === "draft" ? "Nháp" : row.status === "cancelled" ? "Đã hủy" : row.status === "reversed" ? "Đã đảo" : "Đã gửi"}</StatusBadge></Link>)}{!data.recentDocuments.length ? <EmptyState title="Chưa có giao dịch kho" /> : null}</div>
    </SecondarySection>
  </div>;
}
