"use client";

import { ArrowUpRight, ChevronDown, Clock3 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/shared/Button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput, Select } from "@/components/shared/FormControls";
import { Drawer } from "@/components/shared/Overlays";
import { ListWorkspace, WorkspaceMetrics } from "@/components/shared/PageLayouts";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatBusinessDate } from "@/lib/time/timezone";
import type { ProjectHealth, ProjectMonitoringSummary } from "../types/projectTypes";
import { severityLabels, updateTypeLabels } from "./ProjectUpdateCard";
import styles from "./ProjectMonitoringWorkspace.module.css";

const healthLabels: Record<ProjectHealth, string> = { on_track: "Đúng tiến độ", at_risk: "Có rủi ro", delayed: "Chậm tiến độ", paused: "Tạm dừng", completed: "Hoàn thành" };
const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLocaleLowerCase("vi");
type MonitoredProject = ProjectMonitoringSummary["projects"][number];
const tone = (health: ProjectHealth) => health === "completed" || health === "on_track" ? "success" as const : health === "delayed" ? "error" as const : "warning" as const;

export function ProjectMonitoringWorkspace({ summary, canOpenProject, canViewIssues }: { summary: ProjectMonitoringSummary; canOpenProject: boolean; canViewIssues: boolean }) {
  const [query, setQuery] = useState("");
  const [health, setHealth] = useState("");
  const [issuesOpen, setIssuesOpen] = useState(false);
  const projects = useMemo(() => summary.projects.filter(project => (!health || project.health === health) && normalize(`${project.code} ${project.name} ${project.projectManagerName ?? ""}`).includes(normalize(query.trim()))), [summary.projects, query, health]);
  const filtered = Boolean(query.trim() || health);
  const columns: DataTableColumn<MonitoredProject>[] = [
    { id: "project", header: "Dự án / Phụ trách", priority: "primary", sortable: true, sortValue: project => project.name, cell: project => <span className="record-identity"><strong>{project.name}</strong><small>{project.code} · {project.projectManagerName ?? "Chưa phân công"}</small></span> },
    { id: "completion", header: "Tiến độ", sortable: true, sortValue: project => project.completionPercent, cell: project => <span className={styles.completion}><progress aria-label={`Tiến độ ${project.name}`} max={100} value={project.completionPercent} /><strong>{project.completionPercent}%</strong></span> },
    { id: "health", header: "Tình trạng", cell: project => <StatusBadge tone={tone(project.health)}>{healthLabels[project.health]}</StatusBadge> },
    { id: "issues", header: "Vấn đề mức cao", align: "right", width: "compact", hiddenOnMobile: true, sortable: true, sortValue: project => project.openHighIssues, cell: project => <span className={project.openHighIssues ? styles.issueCount : undefined}>{project.openHighIssues || "—"}</span> },
    { id: "updated", header: "Cập nhật gần nhất", hiddenOnMobile: true, cell: project => <span className={styles.updateTime}>{project.latestUpdate ? <time dateTime={project.latestUpdate.createdAt}>{formatBusinessDate(project.latestUpdate.createdAt)}</time> : <span>Chưa có cập nhật</span>}{project.stale ? <span><Clock3 aria-hidden="true" size={13} />Cần cập nhật</span> : null}</span> }
  ];
  return <div className={styles.workspace}>
    <PageHeader title="Theo dõi dự án" action={<Button onClick={() => setIssuesOpen(true)} variant={summary.attention.length ? "primary" : "secondary"}>Vấn đề cần xử lý ({summary.attention.length})</Button>} />
    <div className={styles.workbench}>
      <ListWorkspace label="Dự án đang theo dõi" summary={<WorkspaceMetrics items={[{ label: "Đang hoạt động", value: summary.active }, { label: "Hoàn thành trung bình", value: `${summary.averageCompletion}%` }]} />} filters={<><FilterBar><SearchInput aria-label="Tìm dự án theo dõi" placeholder="Dự án, mã hoặc người phụ trách" value={query} onChange={event => setQuery(event.target.value)} /><Select label="Tình trạng" value={health} onChange={event => setHealth(event.target.value)} options={[{ value: "", label: "Tất cả tình trạng" }, ...Object.entries(healthLabels).map(([value, label]) => ({ value, label }))]} /></FilterBar></>} status={<div className="worklist-summary"><span role="status">{filtered ? `${projects.length} / ${summary.projects.length}` : summary.projects.length} dự án</span>{filtered ? <Button size="sm" variant="ghost" onClick={() => { setQuery(""); setHealth(""); }}>Xóa bộ lọc</Button> : null}</div>}>
<DataTable ariaLabel="Dự án đang theo dõi" columns={columns} data={projects} emptyTitle={filtered ? "Không có dự án phù hợp" : "Chưa có dự án"} emptyDescription="" getRowId={project => project.id} getRowHref={canOpenProject ? project => `/projects/${project.id}/progress` : undefined} pageSize={15} />
</ListWorkspace>

    </div>
    <Drawer title="Vấn đề cần xử lý" open={issuesOpen} onClose={() => setIssuesOpen(false)}>
      <section className={styles.attention} aria-labelledby="monitoring-attention">

        {summary.attention.length ? <ul>{summary.attention.slice(0, 6).map(issue => <li key={issue.id}><div className={styles.issueHeading}>{canViewIssues ? <Link href={`/projects/${issue.projectId}/updates/${issue.sourceUpdateId}`}><strong>{issue.title}</strong><ArrowUpRight aria-hidden="true" size={15} /></Link> : <strong>{issue.title}</strong>}<StatusBadge tone={issue.severity === "critical" || issue.severity === "high" ? "warning" : "neutral"}>{severityLabels[issue.severity]}</StatusBadge></div><span>{issue.projectName}</span><footer>{issue.ownerName ? <span>{issue.ownerName}</span> : <span>Chưa giao xử lý</span>}<time dateTime={issue.updatedAt}>{formatBusinessDate(issue.updatedAt)}</time></footer></li>)}</ul> : <div className={styles.empty}>Không có vấn đề đang mở</div>}
        {canViewIssues ? <Link className={styles.allIssues} href="/project-monitoring/issues">Xem tất cả vấn đề<ArrowUpRight aria-hidden="true" size={15} /></Link> : null}
      </section>
    </Drawer>
    {summary.recentUpdates.length ? <details className={styles.recent}><summary><span>Cập nhật gần đây <small>{summary.recentUpdates.length}</small></span><ChevronDown aria-hidden="true" size={17} /></summary><ul>{summary.recentUpdates.slice(0, 5).map(update => <li key={update.id}><StatusBadge>{updateTypeLabels[update.updateType]}</StatusBadge><span>{canOpenProject ? <Link href={`/projects/${update.projectId}/updates/${update.id}`}>{update.title}</Link> : <strong>{update.title}</strong>}<small>{update.projectName} · {update.authorName}</small></span><time dateTime={update.createdAt}>{formatBusinessDate(update.createdAt)}</time></li>)}</ul><Link className={styles.allIssues} href="/project-monitoring/recent">Xem tất cả cập nhật<ArrowUpRight aria-hidden="true" size={15} /></Link></details> : null}
  </div>;
}
