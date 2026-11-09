import type { Permission } from "@/lib/auth/permissions";

export const EMPLOYEE_ROLE_CODE = "employee";

export const employeeBaselinePermissions: readonly Permission[] = [
  "dashboard.view",
  "profile.view",
  "notification.view",
  "attendance.view",
  "attendance.self.view",
  "attendance.self.create",
  "attendance.self",
  "attendance.self_history",
  "attendance.self_request",
  "payslip.self.view",
  "timesheet.view",
  "timesheet.self.view",
  "leave.view",
  "chat.access",
  "file.read"
];

interface EmployeeRoleLike {
  id: string;
  code: string;
  permissionKeys?: readonly Permission[];
}

export function normalizeEmployeeRoleIds(
  roleIds: readonly string[],
  roles: readonly EmployeeRoleLike[]
): string[] {
  const uniqueRoleIds = [...new Set(roleIds)];
  const employeeRole = roles.find((role) => role.code === EMPLOYEE_ROLE_CODE);
  if (!employeeRole) return uniqueRoleIds;

  const businessRoleIds = uniqueRoleIds.filter((roleId) => roleId !== employeeRole.id);
  return businessRoleIds.length ? businessRoleIds : [employeeRole.id];
}

export function toggleEmployeeRole(
  roleIds: readonly string[],
  toggledRoleId: string,
  roles: readonly EmployeeRoleLike[]
): string[] {
  const employeeRole = roles.find((role) => role.code === EMPLOYEE_ROLE_CODE);
  if (toggledRoleId === employeeRole?.id) return [employeeRole.id];

  const current = normalizeEmployeeRoleIds(roleIds, roles).filter((roleId) => roleId !== employeeRole?.id);
  const next = current.includes(toggledRoleId)
    ? current.filter((roleId) => roleId !== toggledRoleId)
    : [...current, toggledRoleId];
  return normalizeEmployeeRoleIds(next, roles);
}

export function withEmployeeBaseline(permissions: readonly Permission[]): Permission[] {
  return [...new Set([...employeeBaselinePermissions, ...permissions])];
}

const employeePersonalPermissions = new Set<Permission>([
  "attendance.self", "attendance.self.view", "attendance.self.create",
  "attendance.self_history", "attendance.self_request", "timesheet.self.view",
  "leave.self.view", "leave.self.create", "leave.self.withdraw",
  "leave.balance.view_self", "leave.pdf.export_self", "payslip.self.view"
]);

/** Personal HR actions require an employee; system administration does not. */
export function resolveAccountPermissions(permissions: readonly Permission[], employeeId?: string | null, managementOnly = false): Permission[] {
  if (employeeId && !managementOnly) return withEmployeeBaseline(permissions);
  return [...new Set<Permission>(["profile.view", ...permissions.filter((permission) => !employeePersonalPermissions.has(permission))])];
}
