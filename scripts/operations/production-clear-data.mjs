// Explicit one-off cleanup for the production project approved by the owner.
// Rehearse uses ROLLBACK. Execute requires the same reviewed schema and plan.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { managementClient } from "../testing/management.mjs";

const PROJECT = "uioywupuuestcaliawlc", ADMIN = "9266af45-4b87-4aaf-99a3-03fbb7288d2b";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const directory = path.join(root, ".tmp/production-cleanup");
const whole = ["permissions", "roles", "role_permissions", "system_settings", "brand_assets", "feature_flags"];
const partial = ["app_accounts", "account_roles", "employees", "departments", "positions", "employment_types"];
const reviewedTriggers = new Set([
  "approval_delegations_realtime_invalidation", "audit_logs_append_only", "inventory_lines_posted_immutable", "payroll_line_guard",
  "project_assignments_realtime_invalidation", "shift_assignments_realtime_invalidation", "stock_ledger_immutable", "work_calendar_days_realtime_invalidation",
  "employees_realtime_invalidation", "system_settings_realtime_invalidation", "inventory_documents_realtime_invalidation"
]);
const quote = name => { assert(/^[a-z_][a-z0-9_]*$/.test(name)); return `"${name}"`; };
const fingerprint = sql => createHash("sha256").update(sql).digest("hex");
const schemaSql = `select md5(jsonb_build_object(
 'tables',(select jsonb_agg(c.relname order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')),
 'columns',(select jsonb_agg(to_jsonb(c) order by c.table_name,c.ordinal_position) from information_schema.columns c where c.table_schema='public'),
 'constraints',(select jsonb_agg(jsonb_build_array(c.conname,c.conrelid::regclass::text,c.confrelid::regclass::text,pg_get_constraintdef(c.oid)) order by c.oid) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public'),
 'triggers',(select jsonb_agg(jsonb_build_array(c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid)) order by c.relname,t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),
 'migrations',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations))::text) as digest`;

export function cleanupOrder(tables, keys) {
  const pending = new Set(tables), result = [];
  while (pending.size) {
    const leaves = [...pending].filter(name => !keys.some(key => key.parent === name && key.child !== name && pending.has(key.child))).sort();
    assert(leaves.length, `Unreviewed foreign-key cycle: ${[...pending].join(", ")}`);
    for (const name of leaves) { result.push(name); pending.delete(name); }
  }
  return result;
}
function triggerState(trigger) {
  return trigger.tgenabled === "D" ? "disable" : trigger.tgenabled === "A" ? "enable always" : trigger.tgenabled === "R" ? "enable replica" : "enable";
}
export function buildCleanupSql({ inspection, preflight, schemaDigest }) {
  assert.equal(inspection.project, PROJECT); assert.equal(preflight.project, PROJECT);
  const names = inspection.schema.tables.filter(table => table.schema_name === "public").map(table => table.table_name).sort();
  assert.equal(names.length, 169, "Production schema must be reviewed again if table inventory changes");
  for (const name of [...whole, ...partial]) assert(names.includes(name));
  const cleared = names.filter(name => !whole.includes(name) && !partial.includes(name));
  assert(!preflight.keys.some(key => key.parent && names.includes(key.parent) && !names.includes(key.child)), "Cross-schema public references require a separate review");
  for (const column of ["reversal_document_id", "reverses_document_id"]) assert(preflight.columns.some(item => item.table_name === "inventory_documents" && item.column_name === column && item.is_nullable === "YES"));
  const triggers = inspection.schema.triggers.filter(trigger => trigger.schema_name === "public" && !trigger.tgisinternal && (/DELETE/.test(trigger.definition) || ["employees_realtime_invalidation", "system_settings_realtime_invalidation", "inventory_documents_realtime_invalidation"].includes(trigger.tgname)));
  for (const trigger of triggers) assert(reviewedTriggers.has(trigger.tgname), `Unreviewed trigger: ${trigger.tgname}`);
  const owner = inspection.admin;
  assert.equal(owner.id, ADMIN); assert(owner.auth_exists && owner.has_admin_access && owner.auth_user_id && owner.employee_id);
  const begin = `begin; set local lock_timeout='5s'; set local statement_timeout='45s'; select pg_advisory_xact_lock(1129595468);
lock table ${names.map(name => `public.${quote(name)}`).join(",")} in access exclusive mode;
do $$ begin
 if (${schemaSql})<>'${schemaDigest}' then raise exception 'SCHEMA_CHANGED'; end if;
 if exists(select 1 from public.app_configurations where key='testing.environment.guard') then raise exception 'TEST_GUARD_FORBIDDEN'; end if;
 if (select count(*) from public.brand_assets)<>0 then raise exception 'BRAND_FILES_REQUIRE_RETENTION_REVIEW'; end if;
 if not exists(select 1 from public.app_accounts where id='${ADMIN}' and username='admin' and status='active' and auth_user_id='${owner.auth_user_id}' and employee_id='${owner.employee_id}') then raise exception 'ADMIN_CHANGED'; end if;
end $$;
create temporary table ct_cleanup_preserve on commit drop as select u.encrypted_password, md5((select jsonb_agg(to_jsonb(s)-'updated_by'-'updated_at' order by s.group_key) from public.system_settings s)::text) settings_digest from auth.users u where u.id='${owner.auth_user_id}';`;
  const disable = triggers.filter(trigger => trigger.tgenabled !== "D").map(trigger => `alter table public.${quote(trigger.table_name)} disable trigger ${quote(trigger.tgname)};`).join("\n");
  const updates = `
update public.employees set created_by='${ADMIN}' where created_by is distinct from '${ADMIN}'::uuid;
update public.employees set avatar_file_id=null where avatar_file_id is not null;
update public.employees set manager_employee_id=null where id='${owner.employee_id}';
update public.departments set manager_employee_id=null,parent_department_id=null where manager_employee_id is not null or parent_department_id is not null;
update public.positions set department_id='${owner.department_id}' where id='${owner.position_id}' and department_id is distinct from '${owner.department_id}'::uuid;
update public.system_settings set updated_by='${ADMIN}' where updated_by is distinct from '${ADMIN}'::uuid;
update public.feature_flags set updated_by='${ADMIN}' where updated_by is distinct from '${ADMIN}'::uuid;
update public.inventory_documents set reversal_document_id=null,reverses_document_id=null where reversal_document_id is not null or reverses_document_id is not null;
delete from public.account_roles where account_id<>'${ADMIN}' or role_id not in(select id from public.roles where code='admin');
update public.account_roles set assigned_by='${ADMIN}' where assigned_by is distinct from '${ADMIN}'::uuid;`;
  const deletes = cleanupOrder(cleared, preflight.keys).map(name => name === "item_categories" ? `do $$ declare changed integer; begin loop delete from public.item_categories c where not exists(select 1 from public.item_categories child where child.parent_id=c.id); get diagnostics changed=row_count; exit when changed=0; end loop; if exists(select 1 from public.item_categories) then raise exception 'CATEGORY_CYCLE'; end if; end $$;` : `delete from public.${quote(name)};`).join("\n");
  const tail = `
delete from public.app_accounts where id<>'${ADMIN}';
delete from public.employees where id<>'${owner.employee_id}';
delete from public.positions where id<>'${owner.position_id}';
delete from public.departments where id<>'${owner.department_id}';
delete from public.employment_types where id<>'${owner.employment_type_id}';
${triggers.map(trigger => `alter table public.${quote(trigger.table_name)} ${triggerState(trigger)} trigger ${quote(trigger.tgname)};`).join("\n")}
do $$ begin
 ${cleared.map(name => `if exists(select 1 from public.${quote(name)}) then raise exception 'NOT_EMPTY:${name}'; end if;`).join("\n")}
 if (select count(*) from public.app_accounts)<>1 or (select count(*) from public.employees)<>1 then raise exception 'OWNER_COUNT'; end if;
 if not exists(select 1 from public.account_roles ar join public.roles r on r.id=ar.role_id join public.role_permissions rp on rp.role_id=r.id where ar.account_id='${ADMIN}' and r.code='admin' and rp.permission_key='system_admin.access') then raise exception 'ADMIN_PERMISSION'; end if;
 if (select encrypted_password from auth.users where id='${owner.auth_user_id}') is distinct from (select encrypted_password from ct_cleanup_preserve) then raise exception 'ADMIN_PASSWORD_CHANGED'; end if;
 if md5((select jsonb_agg(to_jsonb(s)-'updated_by'-'updated_at' order by s.group_key) from public.system_settings s)::text) is distinct from (select settings_digest from ct_cleanup_preserve) then raise exception 'SETTINGS_CHANGED'; end if;
 if (${schemaSql})<>'${schemaDigest}' then raise exception 'SCHEMA_OR_TRIGGERS_CHANGED'; end if;
end $$;
select 'VERIFIED_PUBLIC_CLEANUP' as result, (select count(*) from public.app_accounts) as accounts;`;
  return { sql: `${begin}\n${disable}\n${updates}\n${deletes}\n${tail}`, cleared, triggers: triggers.map(trigger => trigger.tgname) };
}
async function main() {
  const [action, flag, project, ...extra] = process.argv.slice(2);
  assert(["rehearse", "execute", "finish"].includes(action) && flag === "--project" && project === PROJECT && !extra.length, "Explicit production project required");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const api = await managementClient(), query = (sql, readOnly = true) => api("POST", `/v1/projects/${PROJECT}/database/query`, { query: sql, read_only: readOnly });
  const receiptPath = path.join(directory, "clear-data-receipt.private.json");
  if (action === "finish") {
    const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
    assert(receipt.publicCommitted && receipt.project === PROJECT && receipt.retainedAdmin === ADMIN);
    const accounts = await query(`select id,auth_user_id,username from public.app_accounts`);
    assert.equal(accounts.length, 1); assert.equal(accounts[0].id, ADMIN); assert.equal(accounts[0].auth_user_id, receipt.authUserId);
    const keys = await api("GET", `/v1/projects/${PROJECT}/api-keys`), key = keys.find(item => item.name === "service_role")?.api_key;
    assert(key); const db = createClient(`https://${PROJECT}.supabase.co`, key, { auth: { persistSession: false, autoRefreshToken: false } });
    receipt.removedObjects ??= []; receipt.removedAuthIds ??= [];
    for (const item of receipt.objects) {
      const identity = `${item.bucket}/${item.path}`;
      if (receipt.removedObjects.includes(identity)) continue;
      const { error } = await db.storage.from(item.bucket).remove([item.path]); assert(!error, "Storage deletion failed; receipt preserved");
      receipt.removedObjects.push(identity); await writeFile(receiptPath, JSON.stringify(receipt, null, 2), { mode: 0o600 });
    }
    for (const id of receipt.authIds) {
      assert.notEqual(id, receipt.authUserId);
      if (receipt.removedAuthIds.includes(id)) continue;
      const { error } = await db.auth.admin.deleteUser(id); assert(!error || error.status === 404, "Auth deletion failed; receipt preserved");
      receipt.removedAuthIds.push(id); await writeFile(receiptPath, JSON.stringify(receipt, null, 2), { mode: 0o600 });
    }
    const users = await query("select id from auth.users"), objects = await query("select count(*)::integer as count from storage.objects");
    assert.equal(users.length, 1); assert.equal(users[0].id, receipt.authUserId); assert.equal(objects[0].count, 0);
    receipt.completedAt = new Date().toISOString(); await writeFile(receiptPath, JSON.stringify(receipt, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ project: PROJECT, completed: true, appAccounts: 1, authUsers: 1, objects: 0, retainedUsername: "admin" })); return;
  }
  const inspection = JSON.parse(await readFile(path.join(directory, "inspection.private.json"), "utf8"));
  const preflight = JSON.parse(await readFile(path.join(directory, "preflight.private.json"), "utf8"));
  const [{ digest: schemaDigest }] = await query(schemaSql);
  const plan = buildCleanupSql({ inspection, preflight, schemaDigest });
  const planHash = fingerprint(plan.sql), rehearsalPath = path.join(directory, "rehearsal.private.json");
  if (action === "execute") {
    const rehearsal = JSON.parse(await readFile(rehearsalPath, "utf8"));
    assert(rehearsal.rolledBack && rehearsal.planHash === planHash && rehearsal.schemaDigest === schemaDigest, "A matching successful rollback rehearsal is required");
    assert(Date.now() - Date.parse(rehearsal.at) < 60 * 60 * 1000, "Rehearsal expired");
    const [authIds, objects] = await Promise.all([query(`select id from auth.users where id<>'${inspection.admin.auth_user_id}'`), query("select bucket_id as bucket,name as path from storage.objects order by bucket_id,name")]);
    const receipt = { project: PROJECT, retainedAdmin: ADMIN, authUserId: inspection.admin.auth_user_id, planHash, schemaDigest, backupSkippedByOwner: true, authIds: authIds.map(row => row.id), objects, publicCommitted: false, startedAt: new Date().toISOString() };
    await writeFile(receiptPath, JSON.stringify(receipt, null, 2), { mode: 0o600 });
    const result = await query(`${plan.sql}\ncommit;`, false);
    assert(result.some(row => row.result === "VERIFIED_PUBLIC_CLEANUP"));
    receipt.publicCommitted = true; await writeFile(receiptPath, JSON.stringify(receipt, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ project: PROJECT, publicCommitted: true, clearedTables: plan.cleared.length, retainedUsername: "admin", authAndStoragePending: true }));
  } else {
    const result = await query(`${plan.sql}\nrollback;`, false);
    assert(result.some(row => row.result === "VERIFIED_PUBLIC_CLEANUP"));
    await writeFile(path.join(directory, "reviewed-cleanup.private.sql"), `${plan.sql}\nrollback;`, { mode: 0o600 });
    await writeFile(rehearsalPath, JSON.stringify({ project: PROJECT, at: new Date().toISOString(), rolledBack: true, schemaDigest, planHash, clearedTables: plan.cleared, reviewedTriggers: plan.triggers }, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ project: PROJECT, rolledBack: true, clearedTables: plan.cleared.length, reviewedTriggers: plan.triggers.length, retainedUsername: "admin", liveRowsDeleted: 0 }));
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message.replace(/(?:sbp_|sb_secret_)[A-Za-z0-9._-]+/g, "[redacted]")); process.exitCode = 1; });
