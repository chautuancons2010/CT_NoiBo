import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionDeniedState } from "@/components/shared/States";
import { ProjectWorkerTimesheet } from "@/features/projects/components/ProjectWorkerTimesheet";
import { getProject } from "@/features/projects/services/projectRepository";
import { can } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";

export async function ProjectDetailPage({ projectId, section }: { projectId: string; section: string }) {
  if (section !== "attendance") {
    if (["today", "progress", "team", "materials", "profile", "documents", "overview", "updates", "schedule", "worker-attendance", "history"].includes(section)) redirect(`/projects/${projectId}/attendance`);
    notFound();
  }
  const user = requireAuthenticatedUser(await getRequestUser());
  const project = await getProject(projectId, user);
  const canView = can(user.permissions, "worker_attendance.view") || can(user.permissions, "worker_attendance.view_all") || can(user.permissions, "worker_attendance.view_project");
  return <div className="page-stack"><PageHeader title="Bảng công công nhân" />{canView ? <ProjectWorkerTimesheet project={project} /> : <PermissionDeniedState />}</div>;
}
