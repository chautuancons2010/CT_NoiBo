"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { DataSurface, ListPageLayout } from "@/components/shared/PageLayouts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";
import type { TimesheetException } from "../types/timesheetTypes";

const labels: Record<string, string> = {
  missing_check_in: "Thiếu chấm vào",
  missing_check_out: "Thiếu chấm ra",
  attendance_leave_conflict: "Trùng đơn nghỉ",
  gps_issue: "GPS",
  photo_pending: "Ảnh chờ đồng bộ",
  offline_sync_pending: "Chờ đồng bộ",
  worker_roster_conflict: "Đội công nhân",
  duplicate_source_conflict: "Trùng nguồn"
};

export function TimesheetExceptions({ periodId }: { periodId?: string }) {
  const [items, setItems] = useState<TimesheetException[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(() => fetch(`/api/v1/timesheet-exceptions${periodId ? `?periodId=${periodId}` : ""}`).then(async (response) => {
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message);
    setItems(body.data);
  }), [periodId]);

  useEffect(() => { void load().catch((value: Error) => setError(value.message)); }, [load]);
  useDomainReconciliation("timesheets", load);

  async function resolve(id: string, status: "resolved" | "ignored") {
    const note = window.prompt(status === "resolved" ? "Kết quả xử lý" : "Lý do bỏ qua");
    if (!note) return;
    const response = await fetch(`/api/v1/timesheet-exceptions/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, note })
    });
    const body = await response.json();
    if (!response.ok) { setError(body.error?.message); return; }
    await load();
  }

  const columns = useMemo<DataTableColumn<TimesheetException>[]>(() => [
    { id: "date", header: "Ngày", accessor: "workDate" },
    { id: "employee", header: "Nhân viên", cell: (item) => <><strong>{item.employeeName}</strong><br /><small>{item.employeeCode}</small></> },
    { id: "type", header: "Loại", cell: (item) => labels[item.type] ?? item.type },
    { id: "severity", header: "Mức độ", cell: (item) => <StatusBadge tone={item.severity === "high" ? "error" : "warning"}>{item.severity === "high" ? "Cao" : "Cảnh báo"}</StatusBadge> },
    { id: "status", header: "Trạng thái", cell: (item) => item.status === "open" ? "Chưa xử lý" : item.status === "resolved" ? "Đã xử lý" : "Đã bỏ qua" }
  ], []);

  return (
    <ListPageLayout>
      <DataSurface>
        <DataTable
          actions={(item) => item.status === "open" ? (
            <DropdownMenu label={`Thao tác ngoại lệ ${item.employeeName}`}>
              <button onClick={() => void resolve(item.id, "resolved")} type="button">Xử lý</button>
              <button onClick={() => void resolve(item.id, "ignored")} type="button">Bỏ qua</button>
            </DropdownMenu>
          ) : null}
          columns={columns}
          data={items}
          emptyDescription=""
          emptyTitle="Không có ngoại lệ"
          error={error}
          getRowId={(item) => item.id}
        />
      </DataSurface>
    </ListPageLayout>
  );
}
