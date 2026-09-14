"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { Select } from "@/components/shared/FormControls";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ProjectSummary } from "@/features/projects/types/projectTypes";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";

const status = {
  preparing: { label: "Chuẩn bị", tone: "info" as const }, active: { label: "Đang thực hiện", tone: "success" as const },
  paused: { label: "Tạm dừng", tone: "warning" as const }, completed: { label: "Hoàn thành", tone: "success" as const }, closed: { label: "Đã đóng", tone: "neutral" as const }
};

export function ProjectList() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string>(); const [filter, setFilter] = useState("");
  const load = useCallback(() => fetch("/api/v1/projects", { cache: "no-store" }).then(async (response) => { const body = await response.json() as { data?: ProjectSummary[]; error?: { message: string } }; if (!response.ok || !body.data) throw new Error(body.error?.message); setProjects(body.data); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Không thể tải dự án.")).finally(() => setLoading(false)), []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  useDomainReconciliation("projects", load);
  const data = useMemo(() => projects.filter((project) => !filter || project.status === filter), [filter, projects]);
  const columns: DataTableColumn<ProjectSummary>[] = [
    { id: "code", header: "Mã dự án", cell: (row) => <Link className="text-link" href={`/projects/${row.id}/overview`}>{row.code}</Link> },
    { id: "name", header: "Tên dự án", accessor: "name" }, { id: "customer", header: "Khách hàng", cell: (row) => row.customerName ?? "—", hiddenOnMobile: true },
    { id: "manager", header: "Người phụ trách", cell: (row) => row.projectManagerName ?? "—", hiddenOnMobile: true },
    { id: "dates", header: "Thời gian", cell: (row) => `${row.startDate} → ${row.expectedEndDate ?? "—"}`, hiddenOnMobile: true },
    { id: "people", header: "Nhân sự", cell: (row) => String(row.currentPeople) },
    { id: "status", header: "Trạng thái", cell: (row) => <StatusBadge tone={status[row.status].tone}>{status[row.status].label}</StatusBadge> }
  ];
  return <div className="page-stack"><FilterBar actions={<Link href="/projects/new"><Button leftIcon={<Plus size={16} />} variant="primary">Tạo dự án</Button></Link>}><Select label="Trạng thái" onChange={(event) => setFilter(event.target.value)} options={Object.entries(status).map(([value, item]) => ({ value, label: item.label }))} placeholder="Tất cả" value={filter} /></FilterBar><DataTable columns={columns} data={data} emptyDescription="" emptyTitle="Chưa có dự án" error={error} getRowId={(row) => row.id} loading={loading} /></div>;
}
