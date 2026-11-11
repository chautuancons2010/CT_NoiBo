"use client";

import { Building2, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, IconButton } from "@/components/shared/Button";
import { Worklist, type DataTableColumn } from "@/components/shared/DataTable";
import { FilterTabs } from "@/components/shared/FilterBar";
import { ListWorkspace } from "@/components/shared/PageLayouts";
import { SearchInput } from "@/components/shared/FormControls";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ProjectStatus, ProjectSummary } from "@/features/projects/types/projectTypes";
import { useDomainReconciliation } from "@/lib/realtime/useDomainReconciliation";
import { getBusinessDateKey } from "@/lib/time/timezone";
import { filterPortfolio, portfolioStatus, projectStatusPresentation } from "./projectPortfolioPresentation";
import styles from "./ProjectPortfolioWorkspace.module.css";

const primaryStatuses: ProjectStatus[] = ["active", "preparing", "completed"];
const optionalStatuses: ProjectStatus[] = ["paused", "closed"];

export function ProjectPortfolioWorkspace({ initialProjects }: { canCreate?: boolean; initialProjects?: ProjectSummary[] }) {
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects ?? []);
  const [loading, setLoading] = useState(initialProjects === undefined);
  const [error, setError] = useState<string>();
  const request = useRef<AbortController | null>(null);
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const status = portfolioStatus(params.get("status"));
  const today = getBusinessDateKey();
  const hasFilters = Boolean(query || params.get("status"));
  const initialLoading = loading && !projects.length;

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/v1/projects", { cache: "no-store", signal: controller.signal });
      const body = await response.json() as { data?: ProjectSummary[]; error?: { message?: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Không thể tải danh sách gói.");
      if (request.current === controller) setProjects(body.data);
    } catch (reason) {
      if (request.current === controller) setError(reason instanceof DOMException && reason.name === "AbortError" ? "Máy chủ chưa phản hồi." : reason instanceof Error ? reason.message : "Không thể tải danh sách gói.");
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) { request.current = null; setLoading(false); }
    }
  }, []);
  useEffect(() => {
    if (initialProjects !== undefined) return;
    let mounted = true;
    queueMicrotask(() => { if (mounted) void load(); });
    return () => { mounted = false; request.current?.abort(); request.current = null; };
  }, [initialProjects, load]);
  useDomainReconciliation("projects", load);

  function updateFilters(next: { query?: string; status?: ProjectStatus | "" }) {
    const search = new URLSearchParams(window.location.search);
    if (next.query !== undefined) { if (next.query) search.set("q", next.query); else search.delete("q"); }
    if (next.status !== undefined) { if (next.status) search.set("status", next.status); else search.delete("status"); }
    window.history.replaceState(null, "", `${pathname}${search.size ? `?${search}` : ""}${window.location.hash}`);
  }
  function clearFilters() { updateFilters({ query: "", status: "" }); }

  const counts = useMemo(() => {
    const result: Record<ProjectStatus, number> = { active: 0, preparing: 0, paused: 0, completed: 0, closed: 0 };
    projects.forEach(project => { result[project.status] += 1; });
    return result;
  }, [projects]);
  const filtered = useMemo(() => filterPortfolio(projects, query, status, today), [projects, query, status, today]);
  const statuses = [...primaryStatuses, ...optionalStatuses.filter(value => counts[value] || status === value)];
  const columns: DataTableColumn<ProjectSummary>[] = [
    { id: "name", header: "Gói / Công trường", priority: "primary", cell: project => <Link className={`record-identity ${styles.identity}`} href={`/projects/${encodeURIComponent(project.id)}/attendance`}><span aria-hidden="true" className={styles.projectIcon} data-status={project.status}><Building2 size={19} strokeWidth={1.7} /></span><span className={styles.identityCopy}><strong>{project.name}</strong><small><span className={styles.code}>{project.code}</span></small></span></Link> },
    { id: "status", header: "Trạng thái", cell: project => <StatusBadge tone={projectStatusPresentation[project.status].tone}>{projectStatusPresentation[project.status].label}</StatusBadge> }
  ];

  return <ListWorkspace className={styles.workspace} label="Danh sách gói"
    navigation={<FilterTabs label="Lọc trạng thái gói" value={status ?? ""} onChange={value => updateFilters({ status: portfolioStatus(value) })} options={[{ value: "", label: `Tất cả ${initialLoading ? "—" : projects.length}` }, ...statuses.map(value => ({ value, label: `${projectStatusPresentation[value].label} ${initialLoading ? "—" : counts[value]}` }))]} />}
    filters={<><SearchInput label="Tìm gói" mobilePlaceholder="Tên hoặc mã gói" onChange={event => updateFilters({ query: event.target.value })} placeholder="Tên hoặc mã gói" value={query} /><div className={styles.toolbarActions}>{hasFilters ? <Button className={styles.clear} leftIcon={<X aria-hidden="true" size={15} />} onClick={clearFilters} variant="ghost">Xóa lọc</Button> : null}<IconButton className={styles.refresh} disabled={loading} label="Cập nhật danh sách gói" onClick={() => void load()}><RefreshCw aria-hidden="true" className={loading ? styles.spinning : undefined} size={17} /></IconButton></div></>}>
    {initialLoading ? <LoadingState /> : error && !projects.length ? <ErrorState title="Không thể tải danh sách gói" description={error} action={<Button onClick={() => void load()}>Thử lại</Button>} /> : <>
      {error ? <div className={styles.error} role="alert"><span>{error}</span><Button onClick={() => void load()} size="sm">Thử lại</Button></div> : null}
      {filtered.length ? <Worklist ariaLabel="Danh sách gói" className={styles.table} columns={columns} data={filtered} getRowId={project => project.id} getRowHref={project => `/projects/${encodeURIComponent(project.id)}/attendance`} rowActivation="open" /> : <EmptyState title={projects.length ? "Không tìm thấy gói" : "Chưa có gói"} action={hasFilters ? <Button onClick={clearFilters}>Xóa bộ lọc</Button> : undefined} />}
      <footer aria-live="polite" aria-atomic="true" className={styles.footer} role="status"><span>{loading ? "Đang cập nhật…" : `${filtered.length} / ${projects.length} gói`}</span></footer>
    </>}
  </ListWorkspace>;
}
