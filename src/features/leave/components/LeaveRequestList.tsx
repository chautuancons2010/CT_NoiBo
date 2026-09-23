"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { Select } from "@/components/shared/FormControls";
import { DataManagementWorkspace, DataSurface, ListPageLayout } from "@/components/shared/PageLayouts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { LeaveRequest } from "@/features/leave/types/leaveTypes";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";

const status: Record<string, { label: string }> = {
  draft: { label: "Nháp" },
  submitted: { label: "Đã gửi" },
  pending_approval: { label: "Chờ duyệt" },
  approved: { label: "Đã duyệt" },
  rejected: { label: "Từ chối" },
  withdrawn: { label: "Đã thu hồi" },
  cancelled: { label: "Đã hủy" }
};

export function LeaveRequestList({ scope = "self" }: { scope?: "self" | "all" | "approval" }) {
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const load = useCallback(() => fetch(`/api/v1/leave-requests?scope=${scope}`).then(async (response) => {
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message);
    setItems(body.data);
    setError("");
  }).catch((value: Error) => setError(value.message)).finally(() => setLoading(false)), [scope]);

  useEffect(() => { void load(); }, [load]);
  useDomainReconciliation("leave", load);
  const shown = useMemo(() => filter === "all" ? items : items.filter((item) => item.status === filter), [filter, items]);
  const metrics = useMemo(() => [
    { label: "Tổng đơn", value: items.length },
    { label: "Chờ duyệt", value: items.filter((item) => item.status === "submitted" || item.status === "pending_approval").length },
    { label: "Đã duyệt", value: items.filter((item) => item.status === "approved").length },
    { label: "Từ chối", value: items.filter((item) => item.status === "rejected").length }
  ], [items]);
  const columns = useMemo<DataTableColumn<LeaveRequest>[]>(() => [
    ...(scope !== "self" ? [{ id: "employee", header: "Nhân viên", cell: (item: LeaveRequest) => <><strong>{item.employeeName}</strong><br /><small>{item.employeeCode}</small></> }] : []),
    { id: "number", header: "Mã đơn", accessor: "requestNumber" },
    { id: "type", header: "Loại nghỉ", accessor: "leaveTypeName" },
    { id: "time", header: "Thời gian", cell: (item) => `${item.startDate} – ${item.endDate}`, hiddenOnMobile: true },
    { id: "days", header: "Số ngày", cell: (item) => String(item.calculatedDays) },
    { id: "status", header: "Trạng thái", cell: (item) => <StatusBadge status={item.status}>{status[item.status]?.label ?? item.status}</StatusBadge> }
  ], [scope]);

  return (
    <ListPageLayout>
      <DataManagementWorkspace metrics={metrics}>
      <DataSurface className={scope === "all" ? "leave-management-list" : undefined}>
        <div className="data-surface__toolbar">
          <FilterBar actions={scope === "self" ? <Link href="/leave/new"><Button variant="primary">Tạo đơn nghỉ</Button></Link> : null}>
            <Select label="Trạng thái" onChange={(event) => setFilter(event.target.value)} options={[{ value: "all", label: "Tất cả trạng thái" }, ...Object.entries(status).map(([value, item]) => ({ value, label: item.label }))]} value={filter} />
          </FilterBar>
        </div>
        <DataTable columns={columns} data={shown} emptyDescription="" emptyTitle="Không có đơn nghỉ" error={error} getRowId={(item) => item.id} loading={loading} rowHrefPrefix="/leave/requests/" />
      </DataSurface>
      </DataManagementWorkspace>
    </ListPageLayout>
  );
}
