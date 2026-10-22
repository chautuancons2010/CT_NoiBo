"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/shared/Card";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DataSurface, DetailPageLayout } from "@/components/shared/PageLayouts";
import type { LeaveBalance, LeaveLedgerEntry, LeaveRequest } from "@/features/leave/types/leaveTypes";

export function EmployeeLeavePanel({ employeeId }: { employeeId: string }) {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [ledger, setLedger] = useState<LeaveLedgerEntry[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const year = new Date().getFullYear();

  useEffect(() => {
    void Promise.all([
      fetch(`/api/v1/employees/${employeeId}/leave-balance?year=${year}`).then((response) => response.json()),
      fetch(`/api/v1/employees/${employeeId}/leave-ledger?year=${year}`).then((response) => response.json()),
      fetch("/api/v1/leave-requests?scope=all").then((response) => response.json())
    ]).then(([balanceBody, ledgerBody, requestBody]) => {
      setBalances(balanceBody.data ?? []);
      setLedger(ledgerBody.data ?? []);
      setRequests((requestBody.data ?? []).filter((item: LeaveRequest) => item.employeeId === employeeId));
    });
  }, [employeeId, year]);

  const requestColumns = useMemo<DataTableColumn<LeaveRequest>[]>(() => [
    { id: "number", header: "Mã đơn", cell: (item) => <Link href={`/leave/manage/${item.id}`}>{item.requestNumber}</Link> },
    { id: "type", header: "Loại nghỉ", accessor: "leaveTypeName" },
    { id: "time", header: "Thời gian", cell: (item) => `${item.startDate} – ${item.endDate}` },
    { id: "status", header: "Trạng thái", accessor: "status" }
  ], []);
  const ledgerColumns = useMemo<DataTableColumn<LeaveLedgerEntry>[]>(() => [
    { id: "date", header: "Ngày", accessor: "effectiveDate" },
    { id: "reason", header: "Nội dung", accessor: "reason" },
    { id: "increase", header: "Tăng", cell: (item) => item.amount > 0 ? String(item.amount) : "" },
    { id: "decrease", header: "Giảm", cell: (item) => item.amount < 0 ? String(Math.abs(item.amount)) : "" },
    { id: "reference", header: "Tham chiếu", accessor: "referenceType", hiddenOnMobile: true }
  ], []);

  return (
    <DetailPageLayout>
      <Card><h2 className="section-title">Số dư phép {year}</h2><div className="leave-balance-grid">{balances.map((item) => <article className="leave-balance-card" key={item.leaveTypeId}><strong>{item.leaveTypeName}</strong><b>{item.officialRemaining}</b><span>Chờ duyệt: {item.pending}</span><span>Khả dụng: {item.availableAfterPending}</span></article>)}</div></Card>
      <DataSurface><header className="data-surface__toolbar"><h2 className="section-title">Đơn nghỉ</h2></header><DataTable columns={requestColumns} data={requests} emptyDescription="" emptyTitle="Chưa có đơn nghỉ" getRowId={(item) => item.id} /></DataSurface>
      <DataSurface><header className="data-surface__toolbar"><h2 className="section-title">Lịch sử biến động</h2></header><DataTable columns={ledgerColumns} data={ledger} emptyDescription="" emptyTitle="Chưa có biến động" getRowId={(item) => item.id} /></DataSurface>
    </DetailPageLayout>
  );
}
