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
  tone: "green" | "blue" | "amber" | "purple" | "red";
  launcher: boolean;
}

export const applicationRegistry: readonly ApplicationDefinition[] = [
  { id: "overview", label: "Tổng quan", icon: "LayoutDashboard", baseRoute: "/dashboard", defaultRoute: "/dashboard", routePrefixes: ["/dashboard", "/home"], navigationGroups: ["Tổng quan"], requiredAny: applicationPermissionSets.overview, tone: "green", launcher: false },
  { id: "human-resources", label: "Nhân sự", icon: "Users", baseRoute: "/employees", defaultRoute: "/employees", routePrefixes: ["/employees", "/timesheets", "/shifts", "/leave"], navigationGroups: ["Nhân sự"], moduleFlag: "human_resources", requiredAny: applicationPermissionSets["human-resources"], tone: "blue", launcher: true },
  { id: "attendance", label: "Chấm công", icon: "Clock3", baseRoute: "/attendance", defaultRoute: "/attendance", routePrefixes: ["/attendance"], navigationGroups: ["Nhân sự"], moduleFlag: "attendance", requiredAny: applicationPermissionSets.attendance, tone: "green", launcher: true },
  { id: "projects", label: "Dự án & Công trường", icon: "BriefcaseBusiness", baseRoute: "/projects", defaultRoute: "/projects", routePrefixes: ["/projects", "/project-monitoring", "/worker-attendance"], navigationGroups: ["Dự án"], moduleFlag: "projects", requiredAny: applicationPermissionSets.projects, tone: "amber", launcher: true },
  { id: "warehouse", label: "Kho hàng", icon: "Boxes", baseRoute: "/warehouse", defaultRoute: "/warehouse", routePrefixes: ["/warehouse"], navigationGroups: ["Kho"], moduleFlag: "warehouse", requiredAny: applicationPermissionSets.warehouse, tone: "purple", launcher: true },
  { id: "import-export", label: "Xuất nhập khẩu", icon: "Ship", baseRoute: "/import-export", defaultRoute: "/import-export", routePrefixes: ["/import-export"], navigationGroups: ["Xuất nhập khẩu"], moduleFlag: "import_export", requiredAny: applicationPermissionSets["import-export"], tone: "red", launcher: true },
  { id: "operations", label: "Điều hành", icon: "CheckSquare", baseRoute: "/approvals", defaultRoute: "/approvals", routePrefixes: ["/approvals", "/documents", "/reports", "/notifications", "/profile"], navigationGroups: ["Quản lý"], requiredAny: applicationPermissionSets.operations, tone: "green", launcher: true },
  { id: "system", label: "Hệ thống / Quản trị", icon: "Settings", baseRoute: "/system-admin", defaultRoute: "/system-admin", routePrefixes: ["/system-admin", "/settings"], navigationGroups: ["Hệ thống"], requiredAny: applicationPermissionSets.system, tone: "blue", launcher: true }
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

export function contextualNavigationGroups(
  pathname: string,
  user: AuthenticatedUser,
  modules: ModuleSettings,
  navigation: NavigationSettings
): NavigationGroup[] {
  const application = applicationForPath(pathname);
  return filterGroupsByAccess(desktopNavigation, user.permissions, modules, navigation)
    .filter((group) => application.navigationGroups.includes(group.label))
    .map((group) => ({
      label: application.label,
      items: group.items.filter((item) => itemBelongsToApplication(item, application))
    }))
    .filter((group) => group.items.length > 0);
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
