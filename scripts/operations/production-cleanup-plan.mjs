#!/usr/bin/env node
// PLAN ONLY. This file has no database/network client and cannot execute cleanup.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const PRODUCTION_PROJECT = "uioywupuuestcaliawlc";
export const FORBIDDEN_TEST_PROJECT = "lgmlkagcytfjazulgfbz";
export const RETAINED_ADMIN = Object.freeze({
  accountId: "9266af45-4b87-4aaf-99a3-03fbb7288d2b",
  username: "admin",
  // The auth/employee IDs must be discovered and verified on the live database.
  authUserId: null,
  employeeId: null,
});

const retainedWholeTables = ["permissions", "roles", "role_permissions", "system_settings", "brand_assets", "feature_flags"];
const retainedPartialTables = {
  app_accounts: "Exactly the active admin row above; preserve its existing auth_user_id and credentials.",
  account_roles: "Only the retained admin's admin-role assignment; verify system_admin.access before and after.",
  employees: "Only the retained admin's linked employee; clear manager/avatar and deleted-account provenance references.",
  departments: "Only the retained employee's required department; clear parent/manager references.",
  positions: "Only the retained employee's required position; normalize its department to the retained department.",
  employment_types: "Only the retained employee's required employment type.",
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
if (args.some(arg => !["--sql", "--help"].includes(arg))) throw new Error("Plan-only command: only --sql and --help are accepted. No --execute/--apply/connection arguments exist.");
if (args.includes("--help")) {
  console.log("node scripts/operations/production-cleanup-plan.mjs [--sql]\nDefault: local schema inventory and proposed cleanup policy. --sql: print read-only preflight SQL. Never connects to or changes a database.");
} else if (args.includes("--sql")) {
  console.log(await readFile(path.join(root, "docs/operations/production-cleanup-preflight-20261109.sql"), "utf8"));
} else {
  assert.notEqual(PRODUCTION_PROJECT, FORBIDDEN_TEST_PROJECT);
  const files = (await readdir(path.join(root, "supabase/migrations"))).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
  const tables = new Set();
  for (const file of files) {
    const sql = await readFile(path.join(root, "supabase/migrations", file), "utf8");
    for (const match of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z][a-z0-9_]*)/gi)) tables.add(match[1]);
  }
  for (const name of [...retainedWholeTables, ...Object.keys(retainedPartialTables)]) assert(tables.has(name), `Missing local retention table: ${name}`);
  const clearedTables = [...tables].filter(name => !retainedWholeTables.includes(name) && !(name in retainedPartialTables)).sort();
  console.log(JSON.stringify({
    mode: "PLAN_ONLY_NO_NETWORK_NO_WRITES",
    status: "BLOCKED_PENDING_PRIVILEGED_PRODUCTION_PREFLIGHT_AND_VERIFIED_BACKUP",
    productionProject: PRODUCTION_PROJECT,
    forbiddenProject: FORBIDDEN_TEST_PROJECT,
    retainedAdmin: RETAINED_ADMIN,
    retainedWholeTables,
    retainedPartialTables,
    proposedClearedTables: clearedTables,
    localMigrationCount: files.length,
    localTableCount: tables.size,
    inventoryLimitation: "Local migration names are candidates, not a verified production inventory. Compare live pg_catalog exactly; abort for every unclassified live table, missing required table, unknown FK, trigger, or schema drift.",
    forbiddenOperations: ["TRUNCATE ... CASCADE", "DROP SCHEMA", "session_replication_role=replica", "DISABLE TRIGGER ALL", "SQL deletion from storage.objects", "Any connection or request to the TEST project"],
    stages: [
      "Verify exact production host/project, maintenance gate, retained admin/auth/employee/role graph and no testing.environment.guard marker.",
      "Create and verify encrypted database/auth and object backups outside the public repository; preserve a restore manifest and checksums.",
      "Run only read-only preflight SQL; derive a reviewed explicit child-before-parent DELETE plan from actual foreign keys. Stop on cycles until a named nullable edge is approved.",
      "In one public-schema transaction: lock classified tables, recheck owner, capture object/auth deletion manifests outside DB, disable only reviewed immutable USER triggers, clear business rows, retain the specified admin graph, restore original trigger states, verify exact counts and FK integrity, then commit. Any failure rolls back the entire transaction.",
      "Only after DB commit: delete other auth users with Supabase Auth Admin API using the captured production-only ID allowlist; never delete the retained auth ID. Verify exactly one auth user remains and the admin can log in.",
      "Only after DB/auth success: delete captured obsolete object paths using Supabase Storage API; retain current brand assets. Never delete managed storage catalog rows by SQL. Resume failed batches from a receipt.",
      "Verify production cleanup, admin login and fresh session, empty business tables, retained RBAC/config, unchanged TEST counts/guard, and re-enable production traffic.",
    ],
  }, null, 2));
}
