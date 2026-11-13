import { moduleKeys, type ModuleSettings } from "@/config/systemSettings";

/** One release policy for TEST and production. Permissions still apply. */
export const attendanceOnlyRelease = true;
const humanResourcesRoleCodes = new Set(["hr", "human_resources", "human-resources"]);
export function hasUnrestrictedReleaseAccess(roleCodes?: readonly string[]) {
  return roleCodes?.includes("admin") ?? false;
}
export function hasHumanResourcesReleaseAccess(roleCodes?: readonly string[]) {
  return roleCodes?.some((code) => humanResourcesRoleCodes.has(code)) ?? false;
}
/** Availability only. Each page/API still checks its existing business permission. */
export function hasReleaseAvailabilityAccess(roleCodes?: readonly string[]) {
  return hasUnrestrictedReleaseAccess(roleCodes) || hasHumanResourcesReleaseAccess(roleCodes);
}
export function releaseModuleSettings(modules: ModuleSettings, roleCodes?: readonly string[]): ModuleSettings {
  if (hasUnrestrictedReleaseAccess(roleCodes) || hasHumanResourcesReleaseAccess(roleCodes)) return Object.fromEntries(moduleKeys.map(key => [key, true])) as ModuleSettings;
  return modules;
}
export function isReleasedApplication(id: string, roleCodes?: readonly string[]) {
  if (!attendanceOnlyRelease || hasUnrestrictedReleaseAccess(roleCodes) || hasHumanResourcesReleaseAccess(roleCodes)) return true;
  return ["attendance", "human-resources", "projects", "system"].includes(id);
}
const matches = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
export function isReleasedFeaturePath(path: string, method = "GET", roleCodes?: readonly string[]) {
  if (hasUnrestrictedReleaseAccess(roleCodes) || hasHumanResourcesReleaseAccess(roleCodes)) return true;
  if (!attendanceOnlyRelease) return true;
  if (path.startsWith("/api/")) {
    if (path.startsWith("/api/testing/") || path.startsWith("/api/health/")) return true;
    if (!path.startsWith("/api/v1/")) return false;
    const resource = path.slice("/api/v1/".length);
    if (["auth", "attendance", "worker-attendance", "employees", "hr", "insurance", "accounts", "roles", "shifts", "work-calendar", "timesheet-periods", "timesheet-exceptions", "leave-balances", "leave-policies", "leave-types", "leave-workflows", "leave-settlements", "leave-requests", "workspace", "notifications"].some(prefix => matches(resource, prefix))) return true;
    if (resource === "operations/evidence-retention") return true;
    if (["GET", "HEAD", "OPTIONS"].includes(method) && ["projects", "employees", "modules", "system-settings", "system-notices", "search", "files", "branding"].some(prefix => matches(resource, prefix))) return true;
    return false;
  }
  return ["/personal", "/attendance", "/worker-attendance", "/projects", "/timesheets", "/employees", "/leave", "/settings/attendance", "/settings/leave", "/settings/export-templates", "/settings/users", "/settings/roles", "/settings/permissions", "/system-admin", "/profile", "/applications", "/search", "/notifications", "/login", "/testing", "/module-locked", "/offline"].some(prefix => matches(path, prefix)) || ["/", "/dashboard", "/home", "/logout"].includes(path) || path.startsWith("/_next/") || /\.[a-z0-9]+$/i.test(path);
}

export function bypassStoredModuleLock(path: string, method: string, roleCodes?: readonly string[]) {
  return hasUnrestrictedReleaseAccess(roleCodes) || hasHumanResourcesReleaseAccess(roleCodes) && isReleasedFeaturePath(path, method, roleCodes);
}
