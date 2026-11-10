import { isPathEnabled, type ModuleSettings } from "@/config/systemSettings";
import { can, type AuthenticatedUser, type Permission } from "@/lib/auth/permissions";
import { approvalInboxPermissions } from "@/lib/auth/approvalAccess";
import type { DashboardProfileKey, DashboardShortcut } from "@/features/dashboard/types";

interface ShortcutDefinition extends DashboardShortcut {
  requiredAny: readonly Permission[];
}

const definitions: ShortcutDefinition[] = [
  { key: "attendance.photos", label: "Kiểm tra ảnh chấm công", href: "/attendance/today", icon: "Camera", requiredAny: ["attendance.view_all", "attendance.manage"] },
  { key: "timesheets", label: "Kiểm tra bảng công", href: "/timesheets/matrix", icon: "TableProperties", requiredAny: ["timesheet.view_all", "timesheet.view_team"] },
  { key: "attendance.adjustments", label: "Điều chỉnh công", href: "/timesheets/adjustments", icon: "ClipboardPenLine", requiredAny: ["timesheet.adjust", "attendance.adjust"] },
  { key: "leave.manage", label: "Quản lý nghỉ phép", href: "/leave/manage", icon: "CalendarOff", requiredAny: ["leave.view_all"] },
  { key: "employees", label: "Hồ sơ nhân sự", href: "/employees", icon: "UsersRound", requiredAny: ["employee.view"] },
  { key: "approvals", label: "Phê duyệt đơn từ", href: "/approvals", icon: "CheckSquare", requiredAny: approvalInboxPermissions },
  { key: "projects.monitoring", label: "Theo dõi công trường", href: "/project-monitoring", icon: "ChartNoAxesCombined", requiredAny: ["project_monitoring.view", "project_monitoring.view_all", "project_issue.view"] },
  { key: "projects", label: "Gói / Công trường", href: "/projects", icon: "HardHat", requiredAny: ["project.view"] },
  { key: "worker.today", label: "Điểm danh công trường", href: "/worker-attendance/today", icon: "ClipboardCheck", requiredAny: ["worker_attendance.view", "worker_attendance.create", "worker_attendance.self_scope", "worker_attendance.view_project", "worker_attendance.view_all"] },
  { key: "projects.updates", label: "Nhật ký công trường", href: "/projects/updates", icon: "Newspaper", requiredAny: ["project_update.view_project", "project_update.view_all", "project_update.create"] },
  { key: "warehouse.inventory", label: "Kiểm tra tồn kho", href: "/warehouse/inventory", icon: "Boxes", requiredAny: ["warehouse.view", "warehouse.view_all"] },
  { key: "warehouse.receipts", label: "Phiếu nhập kho", href: "/warehouse/receipts", icon: "PackagePlus", requiredAny: ["warehouse.receipt.view"] },
  { key: "warehouse.issues", label: "Phiếu xuất kho", href: "/warehouse/issues", icon: "PackageMinus", requiredAny: ["warehouse.issue.view"] },
  { key: "warehouse.stock-counts", label: "Kiểm kê kho", href: "/warehouse/stock-counts", icon: "ScanLine", requiredAny: ["warehouse.stock_count.view"] },
  { key: "shipments", label: "Theo dõi lô hàng", href: "/import-export/shipments", icon: "Ship", requiredAny: ["shipment.view"] },
  { key: "shipments.new", label: "Tạo lô hàng", href: "/import-export/shipments/new", icon: "PackagePlus", requiredAny: ["shipment.create"] },
  { key: "shipments.documents", label: "Chứng từ xuất nhập khẩu", href: "/import-export/documents", icon: "FolderArchive", requiredAny: ["shipment_document.view"] },
  { key: "shipments.customs", label: "Theo dõi hải quan", href: "/import-export/customs", icon: "ShieldCheck", requiredAny: ["customs.view"] },
  { key: "payroll", label: "Bảng lương", href: "/accounting/payroll", icon: "Calculator", requiredAny: ["payroll.view", "payroll.create"] },
  { key: "salaries", label: "Hồ sơ lương", href: "/accounting/salaries", icon: "WalletCards", requiredAny: ["salary.view"] },
  { key: "payslips", label: "Phiếu lương", href: "/accounting/payslips", icon: "ReceiptText", requiredAny: ["payroll.view", "payslip.self.view"] },
  { key: "salaries.history", label: "Lịch sử lương", href: "/accounting/salary-history", icon: "History", requiredAny: ["salary.history.view"] },
  { key: "reports", label: "Báo cáo", href: "/reports", icon: "ChartSpline", requiredAny: ["report.view"] },
  { key: "attendance.self", label: "Chấm công hôm nay", href: "/attendance/me", icon: "Camera", requiredAny: ["attendance.self", "attendance.self.view", "attendance.self.create"] },
  { key: "attendance.history", label: "Lịch sử chấm công", href: "/attendance/history", icon: "History", requiredAny: ["attendance.self.view", "attendance.self_history"] },
  { key: "leave.new", label: "Tạo đơn nghỉ phép", href: "/leave/new", icon: "CalendarOff", requiredAny: ["leave.self.create"] },
  { key: "payslips.self", label: "Phiếu lương của tôi", href: "/personal/payslips", icon: "ReceiptText", requiredAny: ["payslip.self.view"] }
];

const profileShortcuts: Record<DashboardProfileKey, readonly string[]> = {
  hr: ["attendance.photos", "timesheets", "leave.manage", "employees", "attendance.adjustments", "approvals"],
  management: ["projects.monitoring", "approvals", "attendance.photos", "warehouse.inventory", "shipments", "reports"],
  supervisor: ["worker.today", "projects"],
  warehouse: ["warehouse.inventory", "warehouse.receipts", "warehouse.issues", "warehouse.stock-counts"],
  import_export: ["shipments", "shipments.new", "shipments.documents", "shipments.customs"],
  accounting: ["payroll", "salaries", "payslips", "salaries.history", "timesheets", "approvals"],
  employee: ["attendance.self", "leave.new", "attendance.history", "payslips.self"]
};

export function dashboardShortcutsFor(user: AuthenticatedUser, profile: DashboardProfileKey, modules: ModuleSettings): DashboardShortcut[] {
  return profileShortcuts[profile].flatMap((key) => {
    const definition = definitions.find((item) => item.key === key);
    if (!definition || !definition.requiredAny.some((permission) => can(user.permissions, permission)) || !isPathEnabled(definition.href, modules)) return [];
    const { key: shortcutKey, label, href, icon } = definition;
    return [{ key: shortcutKey, label, href, icon }];
  });
}
