export type Permission =
  | "dashboard.view"
  | "employee.view"
  | "employee.view_sensitive"
  | "employee.create"
  | "employee.edit"
  | "employee.edit_sensitive"
  | "employee.archive"
  | "employee.offboard"
  | "employee.export_basic"
  | "employee.export_sensitive"
  | "account.view"
  | "account.create"
  | "account.disable"
  | "account.enable"
  | "account.assign_role"
  | "account.revoke_sessions"
  | "attendance.view"
  | "attendance.self.view"
  | "attendance.self.create"
  | "attendance.view_team"
  | "attendance.view_all"
  | "attendance.view_photo"
  | "attendance.review"
  | "attendance.adjust"
  | "attendance.config.view"
  | "attendance.config.manage"
  | "timesheet.view"
  | "shift.view"
  | "shift.manage"
  | "timesheet.self.view"
  | "timesheet.view_team"
  | "timesheet.view_all"
  | "timesheet.adjust"
  | "timesheet.lock"
  | "timesheet.unlock"
  | "timesheet.export"
  | "timesheet.export_detail"
  | "attendance.raw.view"
  | "attendance.photo.view"
  | "export_template.view"
  | "export_template.manage"
  | "report.employee_basic"
  | "report.employee_sensitive"
  | "leave.export"
  | "leave.view"
  | "leave.self.view"
  | "leave.self.create"
  | "leave.self.withdraw"
  | "leave.approve"
  | "leave.approve_all"
  | "leave.view_team"
  | "leave.view_all"
  | "leave.balance.view_self"
  | "leave.balance.view_all"
  | "leave.balance.adjust"
  | "leave.type.manage"
  | "leave.workflow.manage"
  | "leave.policy.manage"
  | "leave.pdf.export_self"
  | "leave.pdf.export_all"
  | "project.view"
  | "project.create"
  | "project.edit"
  | "project.manage_team"
  | "project.manage_schedule"
  | "project_update.create"
  | "project_update.view_project"
  | "project_update.view_all"
  | "project_update.edit_own"
  | "project_update.edit_all"
  | "project_update.archive"
  | "project_update.pin"
  | "project_health.update"
  | "project_issue.view"
  | "project_issue.manage"
  | "project_issue.resolve"
  | "project_monitoring.view"
  | "project_monitoring.view_all"
  | "worker_attendance.view"
  | "worker_attendance.self_scope"
  | "worker_attendance.create"
  | "worker_attendance.view_project"
  | "worker_attendance.view_all"
  | "worker_attendance.view_photo"
  | "worker_attendance.adjust"
  | "worker_attendance.lock"
  | "worksite.view"
  | "worksite.manage"
  | "warehouse.view"
  | "import_export.view"
  | "approval.view"
  | "report.view"
  | "notification.view"
  | "profile.view"
  | "user.view"
  | "role.view"
  | "role.manage"
  | "permission.view"
  | "settings.view"
  | "system_admin.access"
  | "branding.view"
  | "branding.manage"
  | "appearance.view"
  | "appearance.manage"
  | "navigation.manage"
  | "module.manage"
  | "organization_settings.view"
  | "organization_settings.manage"
  | "localization.manage"
  | "config_history.view"
  | "config_history.restore"
  | "department.manage"
  | "position.manage"
  | "audit.view"
  | "integration.view"
  | "file.read"
  | "webhook.publish";

export type PermissionSet = ReadonlySet<Permission>;

export type AccountStatus = "pending_activation" | "active" | "disabled" | "locked" | "invited";

export interface AuthenticatedUser {
  id: string;
  displayName: string;
  email: string;
  status: AccountStatus;
  permissions: Permission[];
}

export const allFoundationPermissions: Permission[] = [
  "dashboard.view",
  "employee.view",
  "employee.view_sensitive",
  "employee.create",
  "employee.edit",
  "employee.edit_sensitive",
  "employee.archive",
  "employee.offboard",
  "employee.export_basic",
  "employee.export_sensitive",
  "account.view",
  "account.create",
  "account.disable",
  "account.enable",
  "account.assign_role",
  "account.revoke_sessions",
  "attendance.view",
  "attendance.self.view",
  "attendance.self.create",
  "attendance.view_team",
  "attendance.view_all",
  "attendance.view_photo",
  "attendance.review",
  "attendance.adjust",
  "attendance.config.view",
  "attendance.config.manage",
  "timesheet.view",
  "shift.view",
  "shift.manage",
  "timesheet.self.view",
  "timesheet.view_team",
  "timesheet.view_all",
  "timesheet.adjust",
  "timesheet.lock",
  "timesheet.unlock",
  "timesheet.export",
  "timesheet.export_detail",
  "attendance.raw.view",
  "attendance.photo.view",
  "export_template.view",
  "export_template.manage",
  "report.employee_basic",
  "report.employee_sensitive",
  "leave.export",
  "leave.view",
  "leave.self.view",
  "leave.self.create",
  "leave.self.withdraw",
  "leave.approve",
  "leave.approve_all",
  "leave.view_team",
  "leave.view_all",
  "leave.balance.view_self",
  "leave.balance.view_all",
  "leave.balance.adjust",
  "leave.type.manage",
  "leave.workflow.manage",
  "leave.policy.manage",
  "leave.pdf.export_self",
  "leave.pdf.export_all",
  "project.view",
  "project.create",
  "project.edit",
  "project.manage_team",
  "project.manage_schedule",
  "project_update.create",
  "project_update.view_project",
  "project_update.view_all",
  "project_update.edit_own",
  "project_update.edit_all",
  "project_update.archive",
  "project_update.pin",
  "project_health.update",
  "project_issue.view",
  "project_issue.manage",
  "project_issue.resolve",
  "project_monitoring.view",
  "project_monitoring.view_all",
  "worker_attendance.view",
  "worker_attendance.self_scope",
  "worker_attendance.create",
  "worker_attendance.view_project",
  "worker_attendance.view_all",
  "worker_attendance.view_photo",
  "worker_attendance.adjust",
  "worker_attendance.lock",
  "worksite.view",
  "worksite.manage",
  "warehouse.view",
  "import_export.view",
  "approval.view",
  "report.view",
  "notification.view",
  "profile.view",
  "user.view",
  "role.view",
  "role.manage",
  "permission.view",
  "settings.view",
  "system_admin.access",
  "branding.view",
  "branding.manage",
  "appearance.view",
  "appearance.manage",
  "navigation.manage",
  "module.manage",
  "organization_settings.view",
  "organization_settings.manage",
  "localization.manage",
  "config_history.view",
  "config_history.restore",
  "department.manage",
  "position.manage",
  "audit.view",
  "integration.view",
  "file.read",
  "webhook.publish"
];

export function createPermissionSet(permissions: readonly Permission[]): PermissionSet {
  return new Set(permissions);
}

export function can(
  permissionSet: PermissionSet | readonly Permission[],
  permission: Permission
): boolean {
  if ("has" in permissionSet) {
    return permissionSet.has(permission);
  }

  return permissionSet.includes(permission);
}

export function canAll(
  permissionSet: PermissionSet | readonly Permission[],
  permissions: readonly Permission[]
): boolean {
  return permissions.every((permission) => can(permissionSet, permission));
}

export function isAccountEnabled(user: Pick<AuthenticatedUser, "status">): boolean {
  return user.status === "active";
}
