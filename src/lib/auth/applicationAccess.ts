import type { Permission } from "@/lib/auth/permissions";

export const applicationPermissionSets = {
  overview: ["dashboard.view"],
  "human-resources": ["employee.view", "contract.view", "insurance.view", "department.manage", "position.manage", "attendance.view_all", "attendance.manage", "attendance.adjust", "attendance.period.manage", "timesheet.view", "timesheet.view_team", "timesheet.view_all", "timesheet.adjust", "shift.view", "leave.view_all"],
  attendance: ["attendance.self", "attendance.self.view", "attendance.self.create", "attendance.self_history", "attendance.self_request"],
  projects: ["project.view", "project_monitoring.view", "project_monitoring.view_all", "project_issue.view", "worker_attendance.view", "worker_attendance.create", "worker_attendance.self_scope", "worker_attendance.view_project", "worker_attendance.view_all"],
  warehouse: ["warehouse.view", "warehouse.view_all", "warehouse.item.view", "warehouse.receipt.view", "warehouse.issue.view", "warehouse.transfer.view", "warehouse.adjustment.view", "warehouse.stock_count.view", "warehouse.ledger.view", "warehouse.master.manage"],
  "import-export": ["shipment.view", "import_contract.view", "shipment_document.view", "customs.view", "partner.view", "module.manage"],
  accounting: ["payroll.view", "payroll.create", "salary.view", "salary.history.view", "payslip.self.view"],
  messaging: ["chat.access"],
  operations: ["approval.inbox.view", "approval.view", "approval.view_assigned", "approval.view_all", "leave.approve", "document.view", "report.view"],
  system: ["system_admin.access", "settings.view", "user.view", "role.view", "permission.view", "integration.view", "attendance.config.view", "warehouse.master.manage"]
} as const satisfies Readonly<Record<string, readonly Permission[]>>;
