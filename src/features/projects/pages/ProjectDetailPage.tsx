import { notFound, redirect } from "next/navigation";

import { projectDetailSections } from "@/config/routeRegistry";
import { PackageWorkspace } from "@/features/projects/components/package-workspace/PackageWorkspace";
import { getProject, getProjectRoster, getProjectSchedule, listProjectProgress } from "@/features/projects/services/projectRepository";
import { listProjectUpdates } from "@/features/projects/services/projectUpdateRepository";
import type { DailySchedule, ProjectProgressNode } from "@/features/projects/types/projectTypes";
import { listWorkerSessions } from "@/features/worker-attendance/services/workerAttendanceRepository";
import { can } from "@/lib/auth/permissions";
import { getRequestUser } from "@/services/auth/getRequestUser";
import { requireAuthenticatedUser } from "@/services/authorization/requirePermission";

export async function ProjectDetailPage({ projectId, section }: { projectId: string; section: string }) {
  const legacySections: Record<string, string> = {
    overview: "profile",
    updates: "progress",
    schedule: "progress",
    "worker-attendance": "team",
    history: "profile"
  };
  if (legacySections[section]) redirect(`/projects/${projectId}/${legacySections[section]}`);
  if (!projectDetailSections.some((item) => item.value === section)) notFound();

  const user = requireAuthenticatedUser(await getRequestUser());
  const project = await getProject(projectId, user);
  const today = new Date();
  const end = new Date(today);
  end.setDate(today.getDate() + 6);
  const todayKey = today.toISOString().slice(0, 10);
  const monthStart = `${todayKey.slice(0, 7)}-01`;

  let schedule: DailySchedule[] = [];
  let progressNodes: ProjectProgressNode[] = [];
  let progressLoadError: string | undefined;
  let scheduleLoadError: string | undefined;
  if (section === "progress") {
    const [progressResult, scheduleResult] = await Promise.allSettled([
      listProjectProgress(user, projectId),
      getProjectSchedule(projectId, todayKey, end.toISOString().slice(0, 10), user),
    ]);
    if (progressResult.status === "fulfilled") progressNodes = progressResult.value;
    else progressLoadError = "Không thể tải tiến độ thi công.";
    if (scheduleResult.status === "fulfilled") schedule = scheduleResult.value;
    else scheduleLoadError = "Không thể tải kế hoạch 7 ngày.";
  }

  const canViewUpdates = can(user.permissions, "project_update.view_project") || can(user.permissions, "project_update.view_all");
  const documentUpdates = canViewUpdates && (section === "documents" || section === "profile")
    ? (await listProjectUpdates(user, projectId, { limit: 100 })).items
    : [];
  const canViewAttendance = can(user.permissions, "worker_attendance.view")
    || can(user.permissions, "worker_attendance.view_all")
    || can(user.permissions, "worker_attendance.view_project");
  const [todayRoster, attendanceSessions] = section === "team"
    ? await Promise.all([
      getProjectRoster(projectId, todayKey, undefined, user),
      canViewAttendance
        ? listWorkerSessions(user, { from: monthStart, to: todayKey, projectId }).catch(() => [])
        : Promise.resolve([])
    ])
    : [[], []];

  const editProgress = can(user.permissions, "project.edit") || can(user.permissions, "project.manage_schedule");
  return <PackageWorkspace
    attendanceSessions={attendanceSessions}
    permissions={{
      editProgress,
      fieldUpdate: editProgress && can(user.permissions, "project_update.create"),
      manageTeam: can(user.permissions, "project.manage_team"),
      manageWorksites: can(user.permissions, "worksite.manage"),
      openAttendance: can(user.permissions, "worker_attendance.create"),
      adjustAttendance: can(user.permissions, "worker_attendance.adjust"),
      exportAttendance: can(user.permissions, "timesheet.export"),
      viewAttendance: canViewAttendance,
      updateHealth: can(user.permissions, "project_health.update"),
      uploadDocuments: can(user.permissions, "project_update.create"),
      viewRecords: canViewUpdates,
      viewDocuments: canViewUpdates
    }}
    progressLoadError={progressLoadError}
    progressNodes={progressNodes}
    project={project}
    schedule={schedule}
    scheduleLoadError={scheduleLoadError}
    section={section}
    today={todayKey}
    todayRoster={todayRoster}
    updates={documentUpdates}
  />;
}
