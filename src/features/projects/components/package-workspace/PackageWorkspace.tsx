import type { DailySchedule, ProjectAssignment, ProjectDetail, ProjectProgressNode, ProjectUpdate } from "@/features/projects/types/projectTypes";
import type { WorkerAttendanceSession } from "@/features/worker-attendance/types/workerAttendanceTypes";

import { PackageAttendanceWorkspace } from "./PackageAttendanceWorkspace";
import { PackageConstructionWorkspace } from "./PackageConstructionWorkspace";
import { PackageContextHeader } from "./PackageContextHeader";
import { PackageDocumentWorkspace } from "./PackageDocumentWorkspace";
import { PackageRecordWorkspace } from "./PackageRecordWorkspace";
import { WorkspaceBody } from "./WorkspaceBody";
import { WorkspaceNav } from "./WorkspaceNav";
import type { PackageWorkspaceSection } from "./WorkspaceNav";
import { PermissionDeniedState } from "@/components/shared/States";
import styles from "./PackageWorkspace.module.css";

export interface PackageWorkspacePermissions {
  editProgress: boolean;
  fieldUpdate: boolean;
  manageTeam: boolean;
  manageWorksites: boolean;
  openAttendance: boolean;
  adjustAttendance: boolean;
  exportAttendance: boolean;
  viewAttendance: boolean;
  updateHealth: boolean;
  uploadDocuments: boolean;
  viewRecords: boolean;
  viewDocuments: boolean;
}

export function PackageWorkspace({
  project,
  section,
  progressNodes,
  progressLoadError,
  schedule,
  scheduleLoadError,
  updates,
  today,
  todayRoster,
  attendanceSessions,
  permissions
}: {
  project: ProjectDetail;
  section: string;
  progressNodes: ProjectProgressNode[];
  progressLoadError?: string;
  schedule: DailySchedule[];
  scheduleLoadError?: string;
  updates: ProjectUpdate[];
  today: string;
  todayRoster: ProjectAssignment[];
  attendanceSessions: WorkerAttendanceSession[];
  permissions: PackageWorkspacePermissions;
}) {
  const roots = progressNodes.filter((node) => !node.parentId);
  const completionPercent = section === "progress" && roots.length
    ? Math.round(roots.reduce((sum, node) => sum + node.completionPercent, 0) / roots.length)
    : section === "progress" ? 0 : undefined;
  const visibleSections: PackageWorkspaceSection[] = ["progress"];
  if (permissions.viewAttendance || permissions.manageTeam || permissions.openAttendance || permissions.adjustAttendance) visibleSections.push("team");
  if (permissions.viewRecords) visibleSections.push("profile");
  if (permissions.viewDocuments) visibleSections.push("documents");

  return (
    <div className={styles.packageWorkspace}>
      <PackageContextHeader
        canManageWorksites={permissions.manageWorksites}
        canUpdateHealth={permissions.updateHealth}
        completionPercent={completionPercent}
        project={project}
      />
      <WorkspaceNav projectId={project.id} section={section} visibleSections={visibleSections} />
      <WorkspaceBody>
        {section === "progress" ? (
          <PackageConstructionWorkspace
            canEdit={permissions.editProgress}
            canFieldUpdate={permissions.fieldUpdate}
            initialLoadError={progressLoadError}
            initialNodes={progressNodes}
            projectId={project.id}
            schedule={schedule}
            scheduleLoadError={scheduleLoadError}
          />
        ) : null}
        {section === "team" ? (
          <PackageAttendanceWorkspace
            attendanceSessions={attendanceSessions}
            canAdjustAttendance={permissions.adjustAttendance}
            canExportAttendance={permissions.exportAttendance}
            canManageTeam={permissions.manageTeam}
            canOpenAttendance={permissions.openAttendance}
            canViewAttendance={permissions.viewAttendance}
            project={project}
            today={today}
            todayRoster={todayRoster}
          />
        ) : null}
        {section === "profile" ? permissions.viewRecords ? <PackageRecordWorkspace updates={updates} /> : <PermissionDeniedState /> : null}
        {section === "documents" ? permissions.viewDocuments ? <PackageDocumentWorkspace canUpload={permissions.uploadDocuments} projectId={project.id} updates={updates} /> : <PermissionDeniedState /> : null}
      </WorkspaceBody>
    </div>
  );
}
