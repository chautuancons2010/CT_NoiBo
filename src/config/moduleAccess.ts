import { moduleForPath, modulesForPath, type ModuleKey, type ModuleSettings } from "@/config/systemSettings";

// Shared endpoints (sessions, configuration, search, notifications and files)
// retain their own authorization. Domain endpoints follow their owning module.
const apiModules: ReadonlyArray<{ module: ModuleKey; prefixes: readonly string[] }> = [
  { module: "human_resources", prefixes: ["employees", "hr", "insurance", "shifts", "timesheet-periods", "timesheet-exceptions", "leave-balances", "leave-policies", "leave-types", "leave-workflows", "leave-settlements", "attendance/settings", "attendance/admin", "attendance/records"] },
  { module: "attendance", prefixes: ["attendance", "leave-requests"] },
  { module: "projects", prefixes: ["projects", "project-updates", "project-monitoring", "worker-attendance"] },
  { module: "warehouse", prefixes: ["warehouse", "warehouses", "items", "item-categories", "uom"] },
  { module: "import_export", prefixes: ["import-export", "shipments", "import-contracts", "shipment-documents"] },
  { module: "accounting", prefixes: ["accounting"] },
  { module: "operations", prefixes: ["approvals", "approval-workflows", "approval-delegations", "documents", "document-types"] },
  { module: "reports", prefixes: ["report-exports", "report-templates"] }
];

export function moduleForRequestPath(pathname: string): ModuleKey | null {
  if (!pathname.startsWith("/api/")) return moduleForPath(pathname);
  if (pathname.startsWith("/api/external/v1/")) {
    const resource = pathname.slice("/api/external/v1/".length).split("/")[0];
    const externalModules: Record<string, ModuleKey> = { employees: "human_resources", timesheets: "human_resources", "attendance-device-events": "attendance", inventory: "warehouse", projects: "projects", shipments: "import_export" };
    return Object.hasOwn(externalModules, resource) ? externalModules[resource] : null;
  }
  if (!pathname.startsWith("/api/v1/")) return null;
  const resource = pathname.slice("/api/v1/".length);
  return apiModules.find(({ prefixes }) => prefixes.some((prefix) => resource === prefix || resource.startsWith(`${prefix}/`)))?.module ?? null;
}

export function lockedModule(module: ModuleKey, modules: ModuleSettings): ModuleKey | null {
  if (!modules[module]) return module;
  if (module === "reports" && !modules.operations) return "operations";
  return null;
}

export function lockedModuleForRequestPath(pathname: string, modules: ModuleSettings): ModuleKey | null {
  if (!pathname.startsWith("/api/")) {
    return modulesForPath(pathname).find((key) => !modules[key]) ?? null;
  }
  const primary = moduleForRequestPath(pathname);
  if (primary) {
    const locked = lockedModule(primary, modules);
    if (locked) return locked;
  }
  // This import/export action writes a warehouse receipt as well.
  if (/^\/api\/v1\/shipments\/[^/]+\/create-warehouse-receipt\/?$/.test(pathname) && !modules.warehouse) return "warehouse";
  return null;
}
