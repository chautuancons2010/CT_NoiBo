import type { Permission } from "@/lib/auth/permissions";
import { can } from "@/lib/auth/permissions";

export const applicationPermissionSets = {
  overview: ["dashboard.view"],
  "human-resources": ["employee.view", "timesheet.view", "leave.view", "shift.view"],
  attendance: ["attendance.view", "attendance.self.view", "attendance.self.create"],
  projects: ["project.view", "project_monitoring.view", "worker_attendance.view"],
  warehouse: ["warehouse.view", "warehouse.item.view", "warehouse.receipt.view"],
  "import-export": ["import_export.view", "shipment.view", "partner.view"],
  operations: ["approval.inbox.view", "document.view", "report.view"],
  system: ["system_admin.access", "settings.view", "user.view"]
} as const satisfies Readonly<Record<string, readonly Permission[]>>;

export function shouldUseWorkspace(user: { permissions: readonly Permission[] }): boolean {
  return Object.entries(applicationPermissionSets)
    .filter(([id]) => id !== "overview")
    .some(([, permissions]) => permissions.some((permission) => can(user.permissions, permission)));
}
