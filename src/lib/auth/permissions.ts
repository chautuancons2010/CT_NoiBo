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
  | "timesheet.view"
  | "leave.view"
  | "project.view"
  | "worker_attendance.view"
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
  "timesheet.view",
  "leave.view",
  "project.view",
  "worker_attendance.view",
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
