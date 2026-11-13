import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { managementClient } from "../testing/management.mjs";

// Production rollout explicitly requested by the owner on 2026-11-12.
// No fixture, account, attendance or project seeding runs here.
const project = "uioywupuuestcaliawlc";
const action = process.argv[2] ?? "inspect";
assert(["inspect", "rehearse", "apply"].includes(action));
const files = (await readdir("supabase/migrations")).filter(name => /^20261112000[1-7]_.*\.sql$/.test(name)).sort();
assert.equal(files.length, 7);
const migrations = await Promise.all(files.map(async filename => ({ filename, version: filename.split("_")[0], sql: await readFile(`supabase/migrations/${filename}`, "utf8") })));
const hash = createHash("sha256").update(migrations.map(m => m.sql).join("\n")).digest("hex");
const api = await managementClient();
const query = (query, read_only = true) => api("POST", `/v1/projects/${project}/database/query`, { query, read_only });
assert.equal((await query("select value from app_configurations where key='testing.environment.guard'")).length, 0, "Production must not contain the TEST guard");
const snapshotSql = `select
 (select count(*)::int from employees) employees,
 (select count(*)::int from app_accounts) accounts,
 (select count(*)::int from attendance_events) attendance,
 (select count(*)::int from worker_attendance_sessions) rounds,
 (select md5(coalesce(jsonb_agg(to_jsonb(e)-'employment_type_id'-'updated_at'-'row_version' order by e.id)::text,'')) from employees e) employee_digest,
 (select md5(coalesce(jsonb_agg(to_jsonb(a) order by a.id)::text,'')) from app_accounts a) account_digest,
 (select md5(coalesce(jsonb_agg(to_jsonb(r) order by r.account_id,r.role_id)::text,'')) from account_roles r) role_digest`;
const [before] = await query(snapshotSql);
const pending = [];
for (const migration of migrations) {
 const existing = await query(`select statements from supabase_migrations.schema_migrations where version='${migration.version}'`);
 if (existing.length) assert.deepEqual(existing[0].statements, [migration.sql], `Registered source differs: ${migration.version}`);
 else pending.push(migration);
}
const receiptPath = "test-results/workforce-review-20261112/production-migrations.json";
if (action === "inspect") { console.log(JSON.stringify({ project, counts: before, pending: pending.map(m => m.version) })); process.exit(0); }
if (action === "apply") {
 const rehearsal = JSON.parse(await readFile(receiptPath, "utf8"));
 assert(rehearsal.project === project && rehearsal.hash === hash && rehearsal.rehearsed && Date.now() - Date.parse(rehearsal.at) < 3600000, "Rehearse this exact source first");
 assert.deepEqual(rehearsal.before, before, "Business records changed since rehearsal");
}
const validate = `do $$ declare actual jsonb; begin
 if (select count(*) from employment_types where code in ('engineer','supervisor') and active)<>1 then raise exception 'SUPERVISOR_GROUP_MISMATCH'; end if;
 if exists(select 1 from employees e join employment_types t on t.id=e.employment_type_id where t.code='engineer') then raise exception 'LEGACY_GROUP_REFERENCE'; end if;
 if (select count(*) from shifts where code in ('PORT_SPECIALIZED','PORT_GENERAL') and break_minutes=90 and schedule_rules->>'arrivalLeadMinutes'='15')<>2 then raise exception 'PORT_RULES_MISSING'; end if;
 select to_jsonb(s) into actual from (${snapshotSql}) s;
 if actual<>'${JSON.stringify(before)}'::jsonb then raise exception 'BUSINESS_RECORDS_CHANGED'; end if;
end $$;`;
const registrations = pending.map(m => `insert into supabase_migrations.schema_migrations(version,name,statements) values('${m.version}','${m.filename.slice(m.version.length + 1, -4)}',array[$migration$${m.sql}$migration$]);`).join("\n");
await query(`begin; set local lock_timeout='5s'; set local statement_timeout='60s';\n${pending.map(m => m.sql).join("\n")}\n${validate}\n${action === "apply" ? registrations : ""}\n${action === "apply" ? "commit" : "rollback"};`, false);
const [after] = await query(snapshotSql);
assert.deepEqual(after, before);
await mkdir("test-results/workforce-review-20261112", { recursive: true });
const receipt = { project, hash, before, rehearsed: true, applied: action === "apply", versions: migrations.map(m => m.version), pendingApplied: action === "apply" ? pending.map(m => m.version) : [], fixturesCopied: false, at: new Date().toISOString() };
await writeFile(receiptPath, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ project, action, passed: true, preservedRecords: true, versions: receipt.versions }));
