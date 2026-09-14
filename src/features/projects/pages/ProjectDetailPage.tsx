import { notFound } from "next/navigation";

import { BackLink } from "@/components/shared/BackLink";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Tabs } from "@/components/shared/Tabs";
import { projectDetailSections } from "@/config/routeRegistry";
import { getEmployeeDataSetAsync } from "@/features/employees/services/employeeRepository";
import { getEmployeePickerOptions } from "@/features/employees/services/employeeService";
import { ProjectDetailView } from "@/features/projects/components/ProjectDetailView";
import { getProject, getProjectSchedule } from "@/features/projects/services/projectRepository";
import { listProjectHealthHistory, listProjectUpdates } from "@/features/projects/services/projectUpdateRepository";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";

export async function ProjectDetailPage({ projectId, section }: { projectId: string; section: string }) {
  if (!projectDetailSections.some((item) => item.value === section)) notFound();
  const user = requireAuthenticatedUser(await getRequestUser());
  const project = await getProject(projectId, user);
  const employeeOptions = getEmployeePickerOptions(await getEmployeeDataSetAsync(), { activeOnly: true });
  const today = new Date(); const end = new Date(today); end.setDate(today.getDate() + 6);
  const schedule = section === "schedule" ? await getProjectSchedule(projectId, today.toISOString().slice(0, 10), end.toISOString().slice(0, 10), user) : [];
  const overviewUpdates = section === "overview" ? (await listProjectUpdates(user, projectId, { limit: 5 })).items : [];
  const healthHistory = section === "history" ? await listProjectHealthHistory(user, projectId) : [];
  return <div className="page-stack"><BackLink href="/projects" label="Danh sách dự án" /><header className="project-detail-header"><span>{project.code}</span><h2>{project.name}</h2><StatusBadge tone={project.status === "active" ? "success" : "neutral"}>{project.status === "active" ? "Đang thực hiện" : project.status}</StatusBadge><small>{project.startDate} → {project.expectedEndDate ?? "—"}</small></header><Tabs items={projectDetailSections.map((item) => ({ label: item.label, href: `/projects/${projectId}/${item.value}`, active: item.value === section }))} label="Dự án" /><ProjectDetailView employeeOptions={employeeOptions} healthHistory={healthHistory} overviewUpdates={overviewUpdates} project={project} schedule={schedule} section={section} /></div>;
}
