export type Permission =
  | "dashboard.view"
  | "employee.view"
  | "employee.create"
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
  | "permission.view"
  | "settings.view"
  | "audit.view"
  | "integration.view"
  | "file.read"
  | "webhook.publish";

export type PermissionSet = ReadonlySet<Permission>;

export type AccountStatus = "active" | "disabled" | "invited";

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
  "employee.create",
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
  "permission.view",
  "settings.view",
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
