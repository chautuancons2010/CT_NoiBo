import {
  desktopNavigation,
  filterGroupsByAccess,
  filterNavigationByPermissions,
  type NavigationGroup,
  type NavigationIcon,
  type NavigationItem
} from "@/config/navigation";
import { isPathEnabled, type ModuleKey, type ModuleSettings, type NavigationSettings } from "@/config/systemSettings";
import type { AuthenticatedUser, Permission } from "@/lib/auth/permissions";
import { can } from "@/lib/auth/permissions";
import { applicationPermissionSets } from "@/lib/auth/applicationAccess";
import { moduleIconRegistry, type ApplicationId, type ModuleIconTone } from "@/config/moduleIconRegistry";

export type { ApplicationId } from "@/config/moduleIconRegistry";

export interface ApplicationDefinition {
  id: ApplicationId;
  label: string;
  icon: NavigationIcon;
  baseRoute: string;
  defaultRoute: string;
  routePrefixes: readonly string[];
  navigationGroups: readonly string[];
  moduleFlag?: ModuleKey;
  requiredAny: readonly Permission[];
  tone: ModuleIconTone;
  accentColor: string;
  accentSoft: string;
  launcher: boolean;
}

export interface LauncherApplication extends ApplicationDefinition {
  accessible: boolean;
}

export const applicationRegistry: readonly ApplicationDefinition[] = [
  { id: "overview", label: "Dashboard", ...moduleIconRegistry.overview, baseRoute: "/dashboard", defaultRoute: "/dashboard", routePrefixes: ["/dashboard", "/home"], navigationGroups: ["Tổng quan"], requiredAny: applicationPermissionSets.overview, launcher: true },
  { id: "human-resources", label: "Nhân sự", ...moduleIconRegistry["human-resources"], baseRoute: "/employees", defaultRoute: "/employees", routePrefixes: ["/dashboard/hr", "/employees", "/attendance/today", "/attendance/logs", "/timesheets", "/leave/manage", "/settings/attendance", "/settings/leave", "/settings/export-templates"], navigationGroups: ["Nhân sự", "Quản trị công"], moduleFlag: "human_resources", requiredAny: applicationPermissionSets["human-resources"], launcher: true },
  { id: "attendance", label: "Cá nhân", ...moduleIconRegistry.attendance, baseRoute: "/attendance/me", defaultRoute: "/attendance/me", routePrefixes: ["/personal", "/attendance", "/leave"], navigationGroups: ["Cá nhân"], moduleFlag: "attendance", requiredAny: applicationPermissionSets.attendance, launcher: true },
  { id: "projects", label: "Gói / Công trường", ...moduleIconRegistry.projects, baseRoute: "/projects", defaultRoute: "/projects", routePrefixes: ["/projects", "/project-monitoring", "/worker-attendance"], navigationGroups: ["Gói / Công trường"], moduleFlag: "projects", requiredAny: applicationPermissionSets.projects, launcher: true },
  { id: "warehouse", label: "Kho", ...moduleIconRegistry.warehouse, baseRoute: "/warehouse", defaultRoute: "/warehouse/inventory", routePrefixes: ["/dashboard/warehouse", "/warehouse", "/settings/warehouse"], navigationGroups: ["Kho", "Hệ thống"], moduleFlag: "warehouse", requiredAny: applicationPermissionSets.warehouse, launcher: true },
  { id: "import-export", label: "Xuất nhập khẩu", ...moduleIconRegistry["import-export"], baseRoute: "/import-export", defaultRoute: "/import-export/shipments", routePrefixes: ["/dashboard/import-export", "/import-export", "/settings/import-export"], navigationGroups: ["Xuất nhập khẩu", "Hệ thống"], moduleFlag: "import_export", requiredAny: applicationPermissionSets["import-export"], launcher: true },
  { id: "accounting", label: "Kế toán", ...moduleIconRegistry.accounting, baseRoute: "/accounting", defaultRoute: "/accounting/salaries", routePrefixes: ["/accounting"], navigationGroups: ["Kế toán"], moduleFlag: "accounting", requiredAny: applicationPermissionSets.accounting, launcher: true },
  { id: "messaging", label: "Tin nhắn", ...moduleIconRegistry.messaging, baseRoute: "/messages", defaultRoute: "/messages", routePrefixes: ["/messages"], navigationGroups: [], requiredAny: applicationPermissionSets.messaging, launcher: false },
  { id: "operations", label: "Đơn từ & Điều hành", ...moduleIconRegistry.operations, baseRoute: "/approvals", defaultRoute: "/approvals", routePrefixes: ["/dashboard/management", "/approvals", "/documents", "/reports", "/notifications", "/profile"], navigationGroups: ["Quản lý"], moduleFlag: "operations", requiredAny: applicationPermissionSets.operations, launcher: true },
  { id: "system", label: "Quản trị", ...moduleIconRegistry.system, baseRoute: "/system-admin", defaultRoute: "/system-admin", routePrefixes: ["/system-admin", "/settings"], navigationGroups: ["Hệ thống"], requiredAny: applicationPermissionSets.system, launcher: true }
] as const;

function itemBelongsToApplication(item: NavigationItem, application: ApplicationDefinition): boolean {
  return applicationForPath(item.href).id === application.id;
}

function overviewFirst(items: NavigationItem[]): NavigationItem[] {
  return items.sort((first, second) => Number(second.icon === "LayoutDashboard") - Number(first.icon === "LayoutDashboard"));
}

export function applicationForPath(pathname: string): ApplicationDefinition {
  return applicationRegistry
    .filter((application) => application.routePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)))
    .sort((first, second) => {
      const matchLength = (application: ApplicationDefinition) => Math.max(...application.routePrefixes
        .filter((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
        .map((prefix) => prefix.length));
      return matchLength(second) - matchLength(first);
    })[0]
    ?? applicationRegistry[0];
}

export function visibleApplications(
  user: AuthenticatedUser,
  modules?: ModuleSettings
): ApplicationDefinition[] {
  return applicationRegistry.filter((application) =>
    application.launcher &&
    (!application.moduleFlag || !modules || modules[application.moduleFlag]) &&
    application.requiredAny.some((permission) => can(user.permissions, permission))
  ).map((application) => ({ ...application, defaultRoute: applicationDefaultRoute(application, user, modules) }));
}

function applicationDefaultRoute(application: ApplicationDefinition, user: AuthenticatedUser, modules?: ModuleSettings): string {
  if (application.id === "human-resources") {
    if (can(user.permissions, "attendance.view_all") || can(user.permissions, "attendance.manage")) return "/attendance/today";
    if (can(user.permissions, "attendance.period.manage")) return "/timesheets";
    if (can(user.permissions, "attendance.adjust")) return "/timesheets/adjustments";
  }
  const firstAccessibleItem = filterNavigationByPermissions(
    desktopNavigation.flatMap((group) => group.items).filter((item) => itemBelongsToApplication(item, application) && (!modules || isPathEnabled(item.href, modules))),
    user.permissions
  )[0];
  return firstAccessibleItem?.href ?? application.defaultRoute;
}

export function applicationsForLauncher(
  user: AuthenticatedUser,
  modules?: ModuleSettings
): LauncherApplication[] {
  return applicationRegistry
    .filter((application) => application.launcher && (!application.moduleFlag || !modules || modules[application.moduleFlag]))
    .map((application) => ({
      ...application,
      defaultRoute: applicationDefaultRoute(application, user, modules),
      accessible: application.requiredAny.some((permission) => can(user.permissions, permission))
    }));
}

export function contextualNavigationGroups(
  pathname: string,
  user: AuthenticatedUser,
  modules: ModuleSettings,
  navigation: NavigationSettings
): NavigationGroup[] {
  const resolved = applicationForPath(pathname);
  const application = resolved.id === "overview" && can(user.permissions, "employee.view")
    ? applicationRegistry.find(item => item.id === "human-resources")! : resolved;
  const accessibleGroups = filterGroupsByAccess(desktopNavigation, user.permissions, modules, navigation);
  const dashboardGroup = accessibleGroups
    .filter((group) => group.label === "Tổng quan")
    .map((group) => ({ label: "Dashboard", items: group.items }));
  const groups = accessibleGroups
    .filter((group) => application.navigationGroups.includes(group.label))
    .map((group) => ({
      label: application.label,
      items: group.items.filter((item) => itemBelongsToApplication(item, application))
    }))
    .filter((group) => group.items.length > 0);
  const items = overviewFirst(groups.flatMap((group) => group.items));
  if (application.id === "overview") return dashboardGroup;
  if (application.id === "messaging") return dashboardGroup;
  const supervisorWorkflow = can(user.permissions, "worker_attendance.create")
    && !can(user.permissions, "attendance.view_all")
    && !can(user.permissions, "attendance.manage")
    && !can(user.permissions, "project_monitoring.view_all");
  if (application.id === "projects" && supervisorWorkflow) {
    const attendanceItems = items.filter((item) => !["/project-monitoring", "/projects/updates"].some((prefix) => item.href === prefix || item.href.startsWith(`${prefix}/`)));
    return [...dashboardGroup, ...(attendanceItems.length ? [{ label: application.label, items: attendanceItems }] : [])];
  }
  if (application.id === "warehouse") {
    const sections = [
      { id: "warehouse-operations", icon: "Boxes", label: "Vận hành kho", paths: ["/warehouse/inventory", "/warehouse/receipts", "/warehouse/issues", "/warehouse/transfers"] },
      { id: "warehouse-reconciliation", icon: "ClipboardCheck", label: "Đối soát kho", paths: ["/warehouse/ledger", "/warehouse/adjustments", "/warehouse/stock-counts"] },
      { id: "warehouse-catalog", icon: "Library", label: "Danh mục", paths: ["/warehouse/items", "/warehouse/warehouses", "/settings/warehouse"] }
    ] satisfies { id: string; icon: NavigationIcon; label: string; paths: string[] }[];
    return [...dashboardGroup, ...sections.map((section) => ({ id: section.id, icon: section.icon, label: section.label, items: section.paths.flatMap((path) => items.find((item) => item.href === path) ?? []) }))
      .filter((section) => section.items.length > 0)];
  }
  if (application.id === "import-export") {
    const sections = [
      { id: "trade-operations", icon: "Ship", label: "Vận hành", paths: ["/import-export/shipments", "/import-export/transport", "/import-export/customs"] },
      { id: "trade-records", icon: "FolderArchive", label: "Hồ sơ & đối tác", paths: ["/import-export/contracts", "/import-export/documents", "/import-export/partners"] },
      { id: "trade-settings", icon: "Settings", label: "Thiết lập", paths: ["/settings/import-export"] }
    ] satisfies { id: string; icon: NavigationIcon; label: string; paths: string[] }[];
    return [...dashboardGroup, ...sections.map((section) => ({ id: section.id, icon: section.icon, label: section.label, items: section.paths.flatMap((path) => items.find((item) => item.href === path) ?? []) }))
      .filter((section) => section.items.length > 0)];
  }
  if (application.id !== "human-resources") return [...dashboardGroup, ...(items.length ? [{ label: application.label, items }] : [])];
  const sections = [
    { id: "hr-records", icon: "Users", label: "Hồ sơ", paths: ["/employees", "/employees/departments", "/employees/positions", "/employees/contracts", "/employees/insurance"] },
    { id: "hr-attendance", icon: "Clock3", label: "Quản lý công", paths: ["/attendance/today", "/employees/field-attendance", "/timesheets/matrix", "/timesheets", "/leave/manage", "/timesheets/adjustments"] },
    { id: "hr-settings", icon: "Settings", label: "Thiết lập", paths: ["/settings/attendance"] }
  ] satisfies { id: string; icon: NavigationIcon; label: string; paths: string[] }[];
  const apps = visibleApplications(user, modules).filter(app => !["overview", "human-resources", "attendance"].includes(app.id)).map(app => ({label:app.label,href:app.defaultRoute,icon:app.icon,requiredPermission:app.requiredAny.find(permission=>can(user.permissions,permission))!}));
  return [...dashboardGroup, ...sections.map((section) => ({ id: section.id, flat: true, icon: section.icon, label: section.label, items: section.paths.flatMap((path) => items.find((item) => item.href === path) ?? []) }))
    .filter((section) => section.items.length > 0), ...(apps.length ? [{ id: "hr-applications", flat: true, label: "Ứng dụng", items: apps }] : [])];
}

export function visibleApplicationShortcuts(
  application: ApplicationDefinition,
  user: AuthenticatedUser,
  modules: ModuleSettings,
  navigation: NavigationSettings
): NavigationItem[] {
  return overviewFirst(filterGroupsByAccess(desktopNavigation, user.permissions, modules, navigation)
    .filter((group) => application.navigationGroups.includes(group.label))
    .flatMap((group) => group.items)
    .filter((item) => itemBelongsToApplication(item, application)));
}
