"use client";

import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/shared/Card";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Select } from "@/components/shared/FormControls";
import { DataSurface, ListPageLayout } from "@/components/shared/PageLayouts";
import type { LeaveBalance, LeaveLedgerEntry } from "@/features/leave/types/leaveTypes";

export function LeaveBalanceView({ all = false }: { all?: boolean }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [ledger, setLedger] = useState<LeaveLedgerEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(`/api/v1/leave-balances?year=${year}${all ? "&scope=all" : ""}`)
      .then((response) => response.json())
      .then((body) => {
        if (!body.ok) throw new Error(body.error?.message);
        setBalances(all ? body.data : body.data.balances);
        setLedger(all ? [] : body.data.ledger);
      })
      .catch((value: Error) => setError(value.message));
  }, [all, year]);

  const columns = useMemo<DataTableColumn<LeaveLedgerEntry>[]>(() => [
    { id: "date", header: "Ngày", accessor: "effectiveDate" },
    { id: "type", header: "Loại nghỉ", accessor: "leaveTypeName" },
    { id: "transaction", header: "Giao dịch", accessor: "transactionType" },
    { id: "amount", header: "Số ngày", cell: (item) => String(item.amount) },
    { id: "reason", header: "Lý do", accessor: "reason", hiddenOnMobile: true }
  ], []);

  return (
    <ListPageLayout>
      <Card>
        <Select
          label="Năm"
          onChange={(event) => setYear(Number(event.target.value))}
          options={[currentYear - 1, currentYear, currentYear + 1].map((value) => ({ value: String(value), label: String(value) }))}
          value={String(year)}
        />
        {error ? <p className="form-error">{error}</p> : null}
        <div className="leave-balance-grid">
          {balances.map((item) => (
            <article className="leave-balance-card" key={`${item.employeeId}-${item.leaveTypeId}`}>
              <strong>{all ? `${item.employeeCode} · ${item.employeeName}` : item.leaveTypeName}</strong>
              {all ? <span>{item.leaveTypeName}</span> : null}
              <b>{item.officialRemaining}</b>
              <dl>
                <div><dt>Đã cấp</dt><dd>{item.granted + item.carryover + item.adjustments}</dd></div>
                <div><dt>Đã dùng</dt><dd>{item.used}</dd></div>
                <div><dt>Chờ duyệt</dt><dd>{item.pending}</dd></div>
                <div><dt>Khả dụng</dt><dd>{item.availableAfterPending}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </Card>
      {!all ? (
        <DataSurface>
          <header className="data-surface__toolbar"><h3>Sổ phép</h3></header>
          <DataTable columns={columns} data={ledger} emptyDescription="" emptyTitle="Chưa có giao dịch" getRowId={(item) => item.id} />
        </DataSurface>
      ) : null}
    </ListPageLayout>
  );
}
