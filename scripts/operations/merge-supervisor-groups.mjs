import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { managementClient } from "../testing/management.mjs";

const [environment, action = "inspect"] = process.argv.slice(2);
const projects = { test: "lgmlkagcytfjazulgfbz", production: "uioywupuuestcaliawlc" };
assert(Object.hasOwn(projects, environment), "Choose test or production explicitly");
assert(["inspect", "rehearse", "apply"].includes(action), "Choose inspect, rehearse or apply");
const project = projects[environment];
const version = "202611120001";
const sql = await readFile(`supabase/migrations/${version}_merge_supervisor_work_groups.sql`, "utf8");
const hash = createHash("sha256").update(sql).digest("hex");
const api = await managementClient();
const query = (query, read_only = true) => api("POST", `/v1/projects/${project}/database/query`, { query, read_only });
const guard = await query("select value from public.app_configurations where key='testing.environment.guard'");
if (environment === "test") assert(guard[0]?.value?.projectId === project && guard[0]?.value?.owner === "ct-noibo-test-v1", "TEST guard mismatch");
else assert.equal(guard.length, 0, "Production must have no TEST guard");
const counts = "select (select count(*)::int from public.employees) employees, (select count(*)::int from public.app_accounts) accounts, (select count(*)::int from public.attendance_events) attendance, (select count(*)::int from public.worker_attendance_sessions) rounds";
const [before] = await query(counts);
const groups = await query("select code,name,active,(select count(*)::int from public.employees e where e.employment_type_id=t.id) employees from public.employment_types t where code in ('engineer','supervisor') order by code");
if (action === "inspect") { console.log(JSON.stringify({ environment, project, counts: before, groups })); process.exit(0); }
const registered = await query(`select statements from supabase_migrations.schema_migrations where version='${version}'`);
if (registered.length) { assert.deepEqual(registered[0].statements, [sql]); console.log(JSON.stringify({ environment, alreadyApplied: true })); process.exit(0); }
await mkdir("test-results/workforce-review-20261112", { recursive: true });
const receiptPath = `test-results/workforce-review-20261112/groups-${environment}.json`;
if (action === "apply") {
  const rehearsal = JSON.parse(await readFile(receiptPath, "utf8"));
  assert(rehearsal.project === project && rehearsal.hash === hash && rehearsal.rehearsed && Date.now() - Date.parse(rehearsal.at) < 3600_000, "Rehearse this exact migration first");
}
const validation = `do $$ begin
 if (select count(*) from public.employment_types where code in ('engineer','supervisor') and active) <> 1 then raise exception 'EXPECTED_ONE_ACTIVE_SUPERVISOR_GROUP'; end if;
 if exists(select 1 from public.employees e join public.employment_types t on e.employment_type_id=t.id where t.code='engineer') then raise exception 'LEGACY_EMPLOYEE_REFERENCE'; end if;
 if (select count(*) from public.employees)<>${before.employees} or (select count(*) from public.app_accounts)<>${before.accounts} or (select count(*) from public.attendance_events)<>${before.attendance} or (select count(*) from public.worker_attendance_sessions)<>${before.rounds} then raise exception 'RECORD_COUNTS_CHANGED'; end if;
end $$;`;
const register = action === "apply" ? `insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','merge_supervisor_work_groups',array[$migration$${sql}$migration$]);` : "";
await query(`begin; set local lock_timeout='5s'; set local statement_timeout='30s'; ${sql}\n${validation}\n${register}\n${action === "apply" ? "commit" : "rollback"};`, false);
const receipt = { environment, project, hash, counts: before, groupsBefore: groups, rehearsed: true, applied: action === "apply", at: new Date().toISOString() };
await writeFile(receiptPath, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ environment, action, passed: true, recordCountsPreserved: true }));
