import type { AuthenticatedUser, Permission } from "@/lib/auth/permissions";
import { can } from "@/lib/auth/permissions";
import {
  dashboardProfileKeys,
  dashboardWidgetKeys,
  type DashboardAction,
  type DashboardLandingPage,
  type DashboardProfileKey,
  type DashboardSettings,
  type DashboardWidgetKey
} from "@/features/dashboard/types";
import { shouldUseWorkspace } from "@/lib/auth/applicationAccess";

interface DashboardProfileDefinition {
  key: DashboardProfileKey;
  label: string;
  requiredAny: Permission[];
  defaultLandingPage: DashboardLandingPage;
}

interface DashboardWidgetDefinition {
  key: DashboardWidgetKey;
  label: string;
  requiredAny: Permission[];
  allowedProfiles: DashboardProfileKey[];
}

export const dashboardProfiles: DashboardProfileDefinition[] = [
  { key: "management", label: "Quản lý", requiredAny: ["project_monitoring.view_all"], defaultLandingPage: "/dashboard/management" },
  { key: "import_export", label: "Xuất nhập khẩu", requiredAny: ["import_export.view", "shipment.view"], defaultLandingPage: "/dashboard/import-export" },
  { key: "warehouse", label: "Kho", requiredAny: ["warehouse.view"], defaultLandingPage: "/dashboard/warehouse" },
  { key: "hr", label: "Nhân sự", requiredAny: ["employee.view", "timesheet.view_all", "leave.view_all"], defaultLandingPage: "/dashboard/hr" },
  { key: "supervisor", label: "Giám sát", requiredAny: ["worker_attendance.create", "worker_attendance.self_scope"], defaultLandingPage: "/home" },
  { key: "employee", label: "Nhân viên", requiredAny: ["attendance.self.view", "leave.self.view", "profile.view", "dashboard.view"], defaultLandingPage: "/home" }
];

export const dashboardWidgetRegistry: DashboardWidgetDefinition[] = [
  { key: "employee_today", label: "Hôm nay", requiredAny: ["attendance.self.view", "attendance.self.create"], allowedProfiles: ["employee"] },
  { key: "supervisor_today", label: "Công trường hôm nay", requiredAny: ["worker_attendance.create", "worker_attendance.self_scope"], allowedProfiles: ["supervisor"] },
  { key: "my_approvals", label: "Phê duyệt cần xử lý", requiredAny: ["approval.inbox.view", "approval.view"], allowedProfiles: [...dashboardProfileKeys] },
  { key: "timesheet_exceptions", label: "Bảng công cần xử lý", requiredAny: ["timesheet.view", "timesheet.view_all", "timesheet.view_team"], allowedProfiles: ["hr", "management"] },
  { key: "project_attention", label: "Dự án cần chú ý", requiredAny: ["project_monitoring.view", "project_monitoring.view_all"], allowedProfiles: ["supervisor", "management"] },
  { key: "warehouse_low_stock", label: "Cảnh báo kho", requiredAny: ["warehouse.view"], allowedProfiles: ["warehouse", "management"] },
  { key: "shipment_attention", label: "Lô hàng cần chú ý", requiredAny: ["import_export.view", "shipment.view"], allowedProfiles: ["import_export", "management"] },
  { key: "hr_summary", label: "Tổng quan nhân sự", requiredAny: ["employee.view"], allowedProfiles: ["hr", "management"] },
  { key: "recent_activity", label: "Hoạt động gần đây", requiredAny: ["audit.view"], allowedProfiles: ["hr", "warehouse", "import_export", "management"] },
  { key: "recent_notifications", label: "Thông báo", requiredAny: ["notification.self.view", "notification.view"], allowedProfiles: [...dashboardProfileKeys] },
  { key: "quick_actions", label: "Thao tác nhanh", requiredAny: ["dashboard.view"], allowedProfiles: [...dashboardProfileKeys] }
];

const defaultWidgets: Record<DashboardProfileKey, DashboardWidgetKey[]> = {
  management: ["my_approvals", "project_attention", "hr_summary", "timesheet_exceptions", "warehouse_low_stock", "shipment_attention", "recent_activity", "quick_actions"],
  import_export: ["shipment_attention", "my_approvals", "recent_notifications", "recent_activity", "quick_actions"],
  warehouse: ["warehouse_low_stock", "my_approvals", "recent_notifications", "recent_activity", "quick_actions"],
  hr: ["my_approvals", "timesheet_exceptions", "hr_summary", "recent_notifications", "recent_activity", "quick_actions"],
  supervisor: ["supervisor_today", "project_attention", "my_approvals", "recent_notifications", "quick_actions"],
  employee: ["employee_today", "my_approvals", "recent_notifications", "quick_actions"]
};

export const defaultDashboardSettings: DashboardSettings = {
  presetOrder: [...dashboardProfileKeys],
  presets: dashboardProfiles.map((profile) => ({
    profile: profile.key,
    landingPage: profile.defaultLandingPage,
    enabledWidgets: [...defaultWidgets[profile.key]]
  }))
};

export function matchesAnyPermission(permissions: readonly Permission[], requiredAny: readonly Permission[]): boolean {
  return requiredAny.length === 0 || requiredAny.some((permission) => can(permissions, permission));
}

export function resolveDashboardProfile(user: AuthenticatedUser, settings: DashboardSettings): DashboardProfileKey {
  for (const key of settings.presetOrder) {
    const profile = dashboardProfiles.find((item) => item.key === key);
    if (profile && matchesAnyPermission(user.permissions, profile.requiredAny)) return profile.key;
  }
  return "employee";
}

export function canUseDashboardProfile(user: AuthenticatedUser, profile: DashboardProfileKey): boolean {
  const definition = dashboardProfiles.find((item) => item.key === profile);
  return Boolean(definition && matchesAnyPermission(user.permissions, definition.requiredAny));
}

export function resolveLandingPage(user: AuthenticatedUser, settings: DashboardSettings): string {
  if (shouldUseWorkspace(user)) return "/workspace";
  return resolveRoleLandingPage(user, settings);
}

export function resolveRoleLandingPage(user: AuthenticatedUser, settings: DashboardSettings): string {
  const profile = resolveDashboardProfile(user, settings);
  const configured = settings.presets.find((item) => item.profile === profile)?.landingPage;
  const candidate = configured ?? dashboardProfiles.find((item) => item.key === profile)?.defaultLandingPage ?? "/dashboard";
  return isLandingPageAllowed(user, candidate) ? candidate : firstAccessibleRoute(user);
}

export function isLandingPageAllowed(user: AuthenticatedUser, route: string): boolean {
  if (route === "/workspace") return shouldUseWorkspace(user);
  const required: Array<[string, Permission[]]> = [
    ["/dashboard/management", ["project_monitoring.view_all"]],
    ["/dashboard/import-export", ["import_export.view", "shipment.view"]],
    ["/dashboard/warehouse", ["warehouse.view"]],
    ["/dashboard/hr", ["employee.view", "timesheet.view_all", "leave.view_all"]],
    ["/worker-attendance", ["worker_attendance.view", "worker_attendance.create"]],
    ["/attendance", ["attendance.view", "attendance.self.view"]],
    ["/projects", ["project.view"]],
    ["/home", ["dashboard.view", "attendance.self.view", "worker_attendance.view"]],
    ["/dashboard", ["dashboard.view"]]
  ];
  const match = required.find(([prefix]) => route === prefix || route.startsWith(`${prefix}/`));
  return match ? matchesAnyPermission(user.permissions, match[1]) : false;
}

export function firstAccessibleRoute(user: AuthenticatedUser): string {
  const candidates = ["/home", "/dashboard", "/attendance", "/worker-attendance/today", "/projects", "/profile"];
  return candidates.find((route) => isLandingPageAllowed(user, route)) ?? "/profile";
}

export function enabledWidgetsFor(user: AuthenticatedUser, profile: DashboardProfileKey, settings: DashboardSettings): DashboardWidgetDefinition[] {
  const selected = settings.presets.find((item) => item.profile === profile)?.enabledWidgets ?? defaultWidgets[profile];
  return selected.flatMap((key) => {
    const widget = dashboardWidgetRegistry.find((item) => item.key === key);
    return widget && widget.allowedProfiles.includes(profile) && matchesAnyPermission(user.permissions, widget.requiredAny) ? [widget] : [];
  });
}

export const commandActions: DashboardAction[] = [
  { key: "employee.create", label: "Thêm nhân viên", href: "/employees/new", requiredPermission: "employee.create" },
  { key: "project.create", label: "Tạo dự án", href: "/projects/new", requiredPermission: "project.create" },
  { key: "warehouse.receipt.create", label: "Tạo phiếu nhập", href: "/warehouse/receipts/new", requiredPermission: "warehouse.receipt.create" },
  { key: "warehouse.issue.create", label: "Tạo phiếu xuất", href: "/warehouse/issues/new", requiredPermission: "warehouse.issue.create" },
  { key: "warehouse.transfer.create", label: "Tạo phiếu chuyển", href: "/warehouse/transfers/new", requiredPermission: "warehouse.transfer.create" },
  { key: "shipment.create", label: "Tạo lô hàng", href: "/import-export/shipments/new", requiredPermission: "shipment.create" },
  { key: "leave.self.create", label: "Tạo đơn nghỉ", href: "/leave/new", requiredPermission: "leave.self.create" },
  { key: "worker_attendance.create", label: "Điểm danh hôm nay", href: "/worker-attendance/today", requiredPermission: "worker_attendance.create" },
  { key: "project_update.create", label: "Cập nhật dự án", href: "/projects/updates", requiredPermission: "project_update.create" }
];

export function visibleQuickActions(user: AuthenticatedUser): DashboardAction[] {
  return commandActions.filter((action) => can(user.permissions, action.requiredPermission));
}

export { dashboardProfileKeys, dashboardWidgetKeys };
