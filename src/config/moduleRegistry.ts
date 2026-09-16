import {
  desktopNavigation,
  filterGroupsByAccess,
  type NavigationGroup,
  type NavigationIcon,
  type NavigationItem
} from "@/config/navigation";
import type { ModuleKey, ModuleSettings, NavigationSettings } from "@/config/systemSettings";
import type { AuthenticatedUser, Permission } from "@/lib/auth/permissions";
import { can } from "@/lib/auth/permissions";
import { applicationPermissionSets } from "@/lib/auth/applicationAccess";

export type ApplicationId =
  | "overview"
  | "human-resources"
  | "attendance"
  | "projects"
  | "warehouse"
  | "import-export"
  | "operations"
  | "system";

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
  tone: "green" | "blue" | "amber" | "purple" | "red" | "slate" | "teal";
  accentColor: string;
  accentSoft: string;
  launcher: boolean;
  dashboardItem?: NavigationItem;
}

export interface LauncherApplication extends ApplicationDefinition {
  accessible: boolean;
}

export const applicationRegistry: readonly ApplicationDefinition[] = [
  { id: "overview", label: "Tổng quan điều hành", icon: "LayoutDashboard", baseRoute: "/dashboard", defaultRoute: "/dashboard", routePrefixes: ["/dashboard", "/home"], navigationGroups: ["Tổng quan"], requiredAny: applicationPermissionSets.overview, tone: "teal", accentColor: "#0f766e", accentSoft: "#ecfdf5", launcher: true },
  { id: "human-resources", label: "Nhân sự", icon: "Users", baseRoute: "/employees", defaultRoute: "/dashboard/hr", routePrefixes: ["/dashboard/hr", "/employees", "/timesheets", "/shifts", "/leave"], navigationGroups: ["Nhân sự"], moduleFlag: "human_resources", requiredAny: applicationPermissionSets["human-resources"], tone: "green", accentColor: "#15803d", accentSoft: "#ecfdf3", launcher: true, dashboardItem: { label: "Tổng quan", href: "/dashboard/hr", icon: "LayoutDashboard", requiredPermission: "employee.view", exact: true } },
  { id: "attendance", label: "Chấm công", icon: "Clock3", baseRoute: "/attendance", defaultRoute: "/attendance", routePrefixes: ["/attendance"], navigationGroups: ["Nhân sự"], moduleFlag: "attendance", requiredAny: applicationPermissionSets.attendance, tone: "blue", accentColor: "#2563eb", accentSoft: "#eff6ff", launcher: true },
  { id: "projects", label: "Dự án & Công trường", icon: "BriefcaseBusiness", baseRoute: "/projects", defaultRoute: "/projects", routePrefixes: ["/projects", "/project-monitoring", "/worker-attendance"], navigationGroups: ["Dự án"], moduleFlag: "projects", requiredAny: applicationPermissionSets.projects, tone: "purple", accentColor: "#7c3aed", accentSoft: "#f5f3ff", launcher: true },
  { id: "warehouse", label: "Kho", icon: "Boxes", baseRoute: "/warehouse", defaultRoute: "/warehouse", routePrefixes: ["/dashboard/warehouse", "/warehouse"], navigationGroups: ["Kho"], moduleFlag: "warehouse", requiredAny: applicationPermissionSets.warehouse, tone: "amber", accentColor: "#c2410c", accentSoft: "#fff7ed", launcher: true },
  { id: "import-export", label: "Xuất nhập khẩu", icon: "Ship", baseRoute: "/import-export", defaultRoute: "/import-export", routePrefixes: ["/dashboard/import-export", "/import-export"], navigationGroups: ["Xuất nhập khẩu"], moduleFlag: "import_export", requiredAny: applicationPermissionSets["import-export"], tone: "teal", accentColor: "#0f766e", accentSoft: "#f0fdfa", launcher: true },
  { id: "operations", label: "Đơn từ & Điều hành", icon: "CheckSquare", baseRoute: "/approvals", defaultRoute: "/approvals", routePrefixes: ["/dashboard/management", "/approvals", "/documents", "/reports", "/notifications", "/profile"], navigationGroups: ["Quản lý"], requiredAny: applicationPermissionSets.operations, tone: "red", accentColor: "#be123c", accentSoft: "#fff1f2", launcher: true },
  { id: "system", label: "Quản trị", icon: "Settings", baseRoute: "/system-admin", defaultRoute: "/system-admin", routePrefixes: ["/system-admin", "/settings"], navigationGroups: ["Hệ thống"], requiredAny: applicationPermissionSets.system, tone: "slate", accentColor: "#475569", accentSoft: "#f1f5f9", launcher: true }
] as const;

function itemBelongsToApplication(item: NavigationItem, application: ApplicationDefinition): boolean {
  if (application.id === "human-resources") return application.routePrefixes.some((prefix) => item.href === prefix || item.href.startsWith(`${prefix}/`));
  if (application.id === "attendance") return item.href === "/attendance" || item.href.startsWith("/attendance/");
  return application.routePrefixes.some((prefix) => item.href === prefix || item.href.startsWith(`${prefix}/`));
}

export function applicationForPath(pathname: string): ApplicationDefinition {
  return applicationRegistry
    .filter((application) => application.routePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)))
    .sort((first, second) => Math.max(...second.routePrefixes.map((prefix) => prefix.length)) - Math.max(...first.routePrefixes.map((prefix) => prefix.length)))[0]
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
  );
}

export function applicationsForLauncher(
  user: AuthenticatedUser,
  modules?: ModuleSettings
): LauncherApplication[] {
  return applicationRegistry
    .filter((application) => application.launcher && (!application.moduleFlag || !modules || modules[application.moduleFlag]))
    .map((application) => ({
      ...application,
      accessible: application.requiredAny.some((permission) => can(user.permissions, permission))
    }));
}

export function contextualNavigationGroups(
  pathname: string,
  user: AuthenticatedUser,
  modules: ModuleSettings,
  navigation: NavigationSettings
): NavigationGroup[] {
  const application = applicationForPath(pathname);
  const groups = filterGroupsByAccess(desktopNavigation, user.permissions, modules, navigation)
    .filter((group) => application.navigationGroups.includes(group.label))
    .map((group) => ({
      label: application.label,
      items: group.items.filter((item) => itemBelongsToApplication(item, application))
    }))
    .filter((group) => group.items.length > 0);
  const dashboardItem = application.dashboardItem && can(user.permissions, application.dashboardItem.requiredPermission)
    ? application.dashboardItem
    : undefined;
  if (!dashboardItem) return groups;
  if (!groups.length) return [{ label: application.label, items: [dashboardItem] }];
  return [{ ...groups[0], items: [dashboardItem, ...groups[0].items.filter((item) => item.href !== dashboardItem.href)] }, ...groups.slice(1)];
}

export function visibleApplicationShortcuts(
  application: ApplicationDefinition,
  user: AuthenticatedUser,
  modules: ModuleSettings,
  navigation: NavigationSettings
): NavigationItem[] {
  return filterGroupsByAccess(desktopNavigation, user.permissions, modules, navigation)
    .filter((group) => application.navigationGroups.includes(group.label))
    .flatMap((group) => group.items)
    .filter((item) => itemBelongsToApplication(item, application));
}
