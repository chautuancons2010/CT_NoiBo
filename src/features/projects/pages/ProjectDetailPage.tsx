import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionDeniedState } from "@/components/shared/States";
import { ProjectWorkerTimesheet } from "@/features/projects/components/ProjectWorkerTimesheet";
import { getProjectPageData } from "./projectPageData";
import { can } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";

export async function ProjectDetailPage({ projectId, section }: { projectId: string; section: string }) {
  const user = requireAuthenticatedUser(await getRequestUser());
  if (section !== "attendance") {
    if (["today", "progress", "team", "materials", "profile", "documents", "overview", "updates", "schedule", "worker-attendance", "history"].includes(section)) redirect(`/projects/${projectId}/attendance`);
    notFound();
  }
  const project = await getProjectPageData(projectId, user);
  const canView = can(user.permissions, "worker_attendance.view") || can(user.permissions, "worker_attendance.view_all") || can(user.permissions, "worker_attendance.view_project");
  return <div className="page-stack"><PageHeader title="Bảng công công nhân" action={can(user.permissions, "worker_attendance.create") && ["active", "preparing"].includes(project.status) ? <Link className="button button--primary" href={`/worker-attendance/today?projectId=${project.id}`}>Điểm danh công nhân</Link> : undefined} />{canView ? <ProjectWorkerTimesheet project={project} /> : <PermissionDeniedState />}</div>;
}
