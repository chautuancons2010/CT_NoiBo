import type { Permission } from "@/lib/auth/permissions";
import { can } from "@/lib/auth/permissions";

export type ProtectedArea =
  | "dashboard" | "employees" | "attendance" | "timesheets" | "shifts"
  | "leave" | "projects" | "project-monitoring" | "worker-attendance"
  | "warehouse" | "import-export" | "approvals" | "documents" | "reports"
  | "notifications" | "profile" | "search" | "settings";

export const areaPermissionCatalog: Readonly<Record<ProtectedArea, readonly Permission[]>> = {
  dashboard: ["dashboard.view", "attendance.self.view", "worker_attendance.view", "project_monitoring.view", "warehouse.view", "import_export.view"],
  employees: ["employee.view"],
  attendance: ["attendance.view", "attendance.self.view", "attendance.self.create", "attendance.view_team", "attendance.view_all"],
  timesheets: ["timesheet.view", "timesheet.self.view", "timesheet.view_team", "timesheet.view_all"],
  shifts: ["shift.view", "shift.manage", "settings.view"],
  leave: ["leave.view", "leave.self.view", "leave.self.create", "leave.view_team", "leave.view_all"],
  projects: ["project.view", "project_update.view_project", "project_update.view_all", "project_update.create"],
  "project-monitoring": ["project_monitoring.view", "project_monitoring.view_all", "project_issue.view"],
  "worker-attendance": ["worker_attendance.view", "worker_attendance.self_scope", "worker_attendance.view_project", "worker_attendance.view_all"],
  warehouse: ["warehouse.view", "warehouse.view_all", "warehouse.item.view", "warehouse.receipt.view", "warehouse.issue.view", "warehouse.transfer.view", "warehouse.ledger.view"],
  "import-export": ["import_export.view", "import_export.view_all", "shipment.view", "import_contract.view", "partner.view"],
  approvals: ["approval.view", "approval.inbox.view", "approval.view_assigned", "approval.view_all", "leave.approve"],
  documents: ["document.view"],
  reports: ["report.view", "report.employee_basic", "report.employee_sensitive"],
  notifications: ["notification.view", "notification.self.view"],
  profile: ["profile.view"],
  search: ["dashboard.view", "employee.view", "project.view", "warehouse.view", "shipment.view", "document.view"],
  settings: ["settings.view", "user.view", "role.view", "permission.view", "integration.view", "attendance.config.view", "leave.type.manage", "warehouse.master.manage"]
};

export function hasAreaAccess(permissions: readonly Permission[], area: ProtectedArea): boolean {
  return areaPermissionCatalog[area].some((permission) => can(permissions, permission));
}
