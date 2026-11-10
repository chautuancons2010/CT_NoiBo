import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { managementClient } from "../testing/management.mjs";

const PROJECT = "uioywupuuestcaliawlc", ADMIN = "9266af45-4b87-4aaf-99a3-03fbb7288d2b";
const [action, flag, project] = process.argv.slice(2);
assert(["rehearse", "apply"].includes(action) && flag === "--project" && project === PROJECT && process.argv.length === 5);
const receipt = JSON.parse(await readFile(".tmp/production-cleanup/clear-data-receipt.private.json", "utf8"));
assert(receipt.completedAt && receipt.retainedAdmin === ADMIN && receipt.project === PROJECT);
const api = await managementClient(), query = (sql, readOnly = true) => api("POST", `/v1/projects/${PROJECT}/database/query`, { query: sql, read_only: readOnly });
const registered = await query("select version from supabase_migrations.schema_migrations order by version");
const versions = new Set(registered.map(row => row.version));
const files = (await readdir("supabase/migrations")).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
const missing = files.filter(name => !versions.has(name.split("_")[0]));
assert(missing.every(name => name > "202610130002_payroll_employee_actions.sql"), "Unexpected historical migration gap");
const parts = [];
for (const file of missing) {
  const sql = await readFile(path.join("supabase/migrations", file), "utf8"), [version] = file.split("_"), name = file.slice(version.length + 1, -4);
  const delimiter = `$ct_migration_${version}$`;
  assert(!sql.includes(delimiter));
  parts.push(`${sql}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${delimiter}${sql}${delimiter}]);`);
}
// Operational defaults contain no sample accounts, projects, clock events or
// employee records. Preserve the existing admin and its password.
const foundation = await readFile("supabase/migrations/202609090002_employee_rbac_foundation.sql", "utf8");
const catalogs = foundation.slice(foundation.indexOf("insert into public.departments"), foundation.indexOf("insert into public.permissions", foundation.indexOf("insert into public.departments")));
assert(catalogs.includes("insert into public.employment_types") && !catalogs.includes("insert into public.employees"));
const defaults = `${catalogs}
insert into public.attendance_policies(name) select 'Chính sách chấm công mặc định' where not exists(select 1 from public.attendance_policies where active);
insert into public.worker_attendance_policies(minimum_photos) select 1 where not exists(select 1 from public.worker_attendance_policies where active);
insert into public.shifts(code,name,start_time,end_time,break_minutes,created_by) select 'DAY','Ca ngày','08:00','17:00',60,'${ADMIN}' where not exists(select 1 from public.shifts where code='DAY' and active);
do $$ begin
 if (select count(*) from public.app_accounts)<>1 or (select count(*) from auth.users)<>1 or (select count(*) from public.employees)<>1 then raise exception 'UNEXPECTED_ACCOUNTS'; end if;
 if exists(select 1 from public.attendance_events) or exists(select 1 from public.worker_attendance_sessions) or exists(select 1 from public.projects) then raise exception 'BUSINESS_DATA_NOT_EMPTY'; end if;
 if exists(select 1 from public.app_configurations where key='testing.environment.guard') then raise exception 'TEST_FORBIDDEN'; end if;
 if not exists(select 1 from public.app_accounts where id='${ADMIN}' and username='admin' and auth_user_id='${receipt.authUserId}') then raise exception 'ADMIN_CHANGED'; end if;
end $$;
notify pgrst,'reload schema';
select 'PRODUCTION_RELEASE_PREPARED' as result;`;
const sql = `begin; set local lock_timeout='5s'; set local statement_timeout='90s'; select pg_advisory_xact_lock(1129595468);\n${parts.join("\n")}\n${defaults}`;
const sha256 = createHash("sha256").update(sql).digest("hex"), planPath = ".tmp/production-cleanup/release-preparation.private.json";
if (action === "apply") {
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  assert(plan.rolledBack && plan.sha256 === sha256 && Date.now() - Date.parse(plan.at) < 3600_000, "Matching rollback rehearsal required");
}
const result = await query(`${sql}\n${action === "apply" ? "commit" : "rollback"};`, false);
assert(result.some(row => row.result === "PRODUCTION_RELEASE_PREPARED"));
await writeFile(planPath, JSON.stringify({ project: PROJECT, at: new Date().toISOString(), sha256, rolledBack: action === "rehearse", applied: action === "apply", migrations: missing, sampleRecordsCreated: 0, retainedUsername: "admin" }, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ project: PROJECT, action, migrations: missing.length, sampleRecordsCreated: 0, retainedUsername: "admin" }));
