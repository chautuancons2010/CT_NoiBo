import Link from "next/link";
import { connection } from "next/server";
import { Card } from "@/components/shared/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { IssueActions } from "@/features/projects/components/IssueActions";
import { severityLabels } from "@/features/projects/components/ProjectUpdateCard";
import { listProjectIssues } from "@/features/projects/services/projectUpdateRepository";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";

export async function ProjectIssueCenterPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await connection();
  const value = (key: string) => { const current = searchParams[key]; return Array.isArray(current) ? current[0] : current; };
  const issues = await listProjectIssues(requireAuthenticatedUser(await getRequestUser()), { status: value("status"), severity: value("severity") });
  return <div className="page-stack"><header className="page-header"><div className="page-header__copy"><h1>Trung tâm vấn đề</h1></div><Link className="button button--secondary button--md" href="/project-monitoring">Theo dõi dự án</Link></header>
    <form className="project-update-filters"><select aria-label="Trạng thái" className="select" defaultValue={value("status") ?? ""} name="status"><option value="">Tất cả trạng thái</option><option value="open">Chưa xử lý</option><option value="in_progress">Đang xử lý</option><option value="resolved">Đã xử lý</option><option value="closed">Đã đóng</option></select><select aria-label="Mức độ" className="select" defaultValue={value("severity") ?? ""} name="severity"><option value="">Tất cả mức độ</option><option value="critical">Nghiêm trọng</option><option value="high">Cao</option><option value="medium">Trung bình</option><option value="low">Thấp</option></select><button className="button button--secondary button--md" type="submit">Lọc</button></form>
    <Card className="issue-table-card"><div className="data-table-scroll"><table className="data-table issue-table"><thead><tr><th>Dự án</th><th>Vấn đề</th><th>Mức độ</th><th>Trạng thái</th><th>Phụ trách</th><th>Cập nhật</th><th></th></tr></thead><tbody>{issues.map((issue) => <tr key={issue.id}><td><Link href={`/projects/${issue.projectId}/overview`}>{issue.projectName}</Link><small>{issue.worksiteName}</small></td><td><Link href={`/projects/${issue.projectId}/updates/${issue.sourceUpdateId}`}>{issue.title}</Link></td><td><StatusBadge tone={issue.severity === "critical" ? "error" : issue.severity === "low" ? "info" : "warning"}>{severityLabels[issue.severity]}</StatusBadge></td><td>{issue.status === "resolved" ? "Đã xử lý" : issue.status === "in_progress" ? "Đang xử lý" : issue.status === "closed" ? "Đã đóng" : "Chưa xử lý"}</td><td>{issue.ownerName ?? "—"}</td><td>{new Date(issue.updatedAt).toLocaleDateString("vi-VN")}</td><td><IssueActions issue={issue} /></td></tr>)}</tbody></table></div></Card>
  </div>;
}
