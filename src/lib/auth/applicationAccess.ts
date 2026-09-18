import type { Permission } from "@/lib/auth/permissions";

export const applicationPermissionSets = {
  overview: ["dashboard.view"],
  "human-resources": ["employee.view", "contract.view", "insurance.view", "department.manage", "position.manage", "attendance.view_all", "attendance.manage", "attendance.adjust", "attendance.period.manage", "timesheet.view", "shift.view", "leave.view_all"],
  attendance: ["attendance.self", "attendance.self.view", "attendance.self.create", "attendance.self_history", "attendance.self_request"],
  projects: ["project.view", "project_monitoring.view", "worker_attendance.view"],
  warehouse: ["warehouse.view", "warehouse.item.view", "warehouse.receipt.view", "warehouse.master.manage"],
  "import-export": ["import_export.view", "shipment.view", "customs.view", "partner.view", "module.manage"],
  accounting: ["accounting.access", "payroll.view", "salary.view", "salary.history.view", "payslip.self.view"],
  messaging: ["chat.access"],
  operations: ["approval.inbox.view", "document.view", "report.view"],
  system: ["system_admin.access", "settings.view", "user.view"]
} as const satisfies Readonly<Record<string, readonly Permission[]>>;
