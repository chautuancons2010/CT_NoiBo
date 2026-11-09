import { connection } from "next/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProjectUpdateCard } from "@/features/projects/components/ProjectUpdateCard";
import { ProjectMonitoringWorkspace } from "@/features/projects/components/ProjectMonitoringWorkspace";
import { getProjectMonitoring } from "@/features/projects/services/projectUpdateRepository";
import { can } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";

export async function ProjectMonitoringPage({ recentOnly = false }: { recentOnly?: boolean }) {
  await connection();
  const user = requireAuthenticatedUser(await getRequestUser());
  const summary = await getProjectMonitoring(user);
  if (recentOnly) return <div className="page-stack"><PageHeader title="Cập nhật gần đây" /><div className="project-update-timeline">{summary.recentUpdates.map(update => <ProjectUpdateCard key={update.id} showProject update={update} />)}</div></div>;
  return <ProjectMonitoringWorkspace summary={summary} canOpenProject={can(user.permissions, "project.view")} canViewIssues={can(user.permissions, "project_issue.view")} />;
}
