"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { DataSurface, ListPageLayout } from "@/components/shared/PageLayouts";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { Payslip } from "../types";
import { useMobileViewport } from "@/lib/ui/useMobileViewport";

const money = (value: unknown) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));

export function PayslipConsole({ canRevoke, selfOnly = false }: { canRevoke: boolean; selfOnly?: boolean }) {
  const mobile = useMobileViewport();
  const selfScope = selfOnly || mobile;
  const [items, setItems] = useState<Payslip[]>([]);
  const [loadedScope, setLoadedScope] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string>();
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (selfScope === null) return;
    const request = ++requestId.current;
    const response = await fetch(`/api/v1/accounting/payslips${selfScope ? "?scope=self" : ""}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message);
    if (request !== requestId.current) return;
    setItems(body.data);
    setLoadedScope(selfScope);
  }, [selfScope]);

  useEffect(() => {
    queueMicrotask(() => void load().catch((reason) => setError(reason.message)));
  }, [load]);

  async function revoke(item: Payslip) {
    const reason = window.prompt(`Lý do thu hồi phiếu lương của ${item.employeeName}:`);
    if (!reason) return;
    setBusyId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/v1/accounting/payslips/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể thu hồi phiếu lương.");
    } finally {
      setBusyId(undefined);
    }
  }

  const columns: DataTableColumn<Payslip>[] = [
    ...(!selfScope ? [{ id: "employee", header: "Nhân viên", cell: (item: Payslip) => <strong>{item.employeeName}</strong> }] : []),
    { id: "period", header: "Kỳ lương", cell: (item) => <Link className="text-link" href={`/accounting/payslips/${item.id}${selfScope ? "?scope=self" : ""}`}>{item.periodMonth.slice(0, 7)}</Link> },
    { id: "version", header: "Phiên bản", cell: (item) => `v${item.version}` },
    { id: "net", header: "Thực nhận", cell: (item) => <strong>{money(item.snapshot.netSalary)}</strong>, align: "right" },
    { id: "published", header: "Phát hành", cell: (item) => item.publishedAt ? new Intl.DateTimeFormat("vi-VN").format(new Date(item.publishedAt)) : "—", hiddenOnMobile: true },
    { id: "viewed", header: "Đã xem", cell: (item) => item.viewedAt ? new Intl.DateTimeFormat("vi-VN").format(new Date(item.viewedAt)) : <StatusBadge tone="info">Mới</StatusBadge>, hiddenOnMobile: true },
    { id: "status", header: "Trạng thái", cell: (item) => <><StatusBadge status={item.status} />{item.status === "revoked" && item.revokeReason ? <small>{item.revokeReason}</small> : null}</> }
  ];

  return (
    <ListPageLayout><DataSurface><DataTable
      actions={(item) => <DropdownMenu label={`Thao tác phiếu lương ${item.employeeName}`}><a href={`/api/v1/accounting/payslips/${item.id}/download`}>Tải PDF</a>{canRevoke && !selfScope && item.status === "published" ? <button disabled={busyId === item.id} onClick={() => void revoke(item)} type="button">Thu hồi</button> : null}</DropdownMenu>}
      columns={columns}
      data={loadedScope === selfScope ? items : []}
      emptyDescription=""
      emptyTitle="Chưa có phiếu lương"
      error={error}
      getRowId={(item) => item.id}
      rowHrefPrefix="/accounting/payslips/"
      rowHrefSuffix={selfScope ? "?scope=self" : ""}
    /></DataSurface></ListPageLayout>
  );
}
