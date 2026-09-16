import { AlertTriangle, ArrowRight, Clock3 } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Card, StatCard } from "@/components/shared/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ProjectUpdateCard, severityLabels } from "@/features/projects/components/ProjectUpdateCard";
import { getProjectMonitoring } from "@/features/projects/services/projectUpdateRepository";
import type { ProjectHealth } from "@/features/projects/types/projectTypes";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";

const healthLabels: Record<ProjectHealth, string> = { on_track: "Đúng tiến độ", at_risk: "Có rủi ro", delayed: "Chậm tiến độ", paused: "Tạm dừng", completed: "Hoàn thành" };
function healthTone(health: ProjectHealth) { return health === "on_track" || health === "completed" ? "success" : health === "delayed" ? "error" : "warning"; }

export async function ProjectMonitoringPage({ recentOnly = false }: { recentOnly?: boolean }) {
  await connection();
  const summary = await getProjectMonitoring(requireAuthenticatedUser(await getRequestUser()));
  if (recentOnly) return <div className="page-stack"><header className="page-header"><div className="page-header__copy"><h1>Cập nhật gần đây</h1></div></header><div className="project-update-timeline">{summary.recentUpdates.map((update) => <ProjectUpdateCard key={update.id} showProject update={update} />)}</div></div>;
  return <div className="page-stack project-monitoring"><header className="page-header"><div className="page-header__copy"><h1>Theo dõi dự án</h1></div><Link className="button button--secondary button--md" href="/project-monitoring/issues">Trung tâm vấn đề</Link></header>
    <div className="monitoring-stats"><StatCard label="Đang hoạt động" value={String(summary.active)} /><StatCard label="Đúng tiến độ" value={String(summary.onTrack)} /><StatCard label="Có rủi ro" value={String(summary.atRisk)} /><StatCard label="Chậm tiến độ" value={String(summary.delayed)} /><StatCard label="Tạm dừng" value={String(summary.paused)} /></div>
    <div className="monitoring-grid"><Card className="monitoring-projects"><div className="panel-header"><h3>Dự án</h3><StatusBadge>{summary.projects.length}</StatusBadge></div><div className="monitoring-project-list">{summary.projects.map((project) => <Link href={`/projects/${project.id}/overview`} key={project.id}><span><strong>{project.name}</strong><small>{project.projectManagerName ?? "Chưa phân công"}</small></span><StatusBadge tone={healthTone(project.health)}>{healthLabels[project.health]}</StatusBadge><span className="monitoring-signal">{project.openHighIssues ? <><AlertTriangle size={15} />{project.openHighIssues}</> : project.stale ? <><Clock3 size={15} />Chưa cập nhật gần đây</> : ""}</span><ArrowRight size={16} /></Link>)}</div></Card>
      <Card className="attention-panel"><div className="panel-header"><h3>Cần chú ý</h3><Link href="/project-monitoring/issues">Xem tất cả</Link></div>{summary.attention.slice(0, 6).map((issue) => <Link href={`/projects/${issue.projectId}/updates/${issue.sourceUpdateId}`} key={issue.id}><span><strong>{issue.title}</strong><small>{issue.projectName}</small></span><StatusBadge tone={issue.severity === "critical" ? "error" : "warning"}>{severityLabels[issue.severity]}</StatusBadge><time>{new Date(issue.updatedAt).toLocaleDateString("vi-VN")}</time></Link>)}</Card>
    </div>
    <Card><div className="panel-header"><h3>Cập nhật gần đây</h3><Link href="/project-monitoring/recent">Xem tất cả</Link></div><div className="monitoring-recent">{summary.recentUpdates.slice(0, 5).map((update) => <ProjectUpdateCard key={update.id} showProject update={update} />)}</div></Card>
  </div>;
}
