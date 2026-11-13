import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { managementClient } from "../testing/management.mjs";

// Deliberately TEST-only. This helper cannot address production.
const project = "lgmlkagcytfjazulgfbz";
const action = process.argv[2] || "rehearse";
assert(["rehearse", "apply", "inspect"].includes(action));
const filenames = ["202611120002_port_shift_rules.sql","202611120003_worker_work_events_overtime.sql","202611120004_timesheet_work_breakdown.sql","202611120005_work_events_realtime.sql","202611120006_admin_field_access.sql","202611120007_persist_work_breakdown.sql"];
const migrations = await Promise.all(filenames.map(async filename => ({ filename, version: filename.split("_")[0], sql: await readFile(`supabase/migrations/${filename}`,"utf8") })));
const hash = createHash("sha256").update(migrations.map(item => item.sql).join("\n")).digest("hex");
const api = await managementClient();
const query = (query, read_only = true) => api("POST",`/v1/projects/${project}/database/query`,{query,read_only});
const marker = await query("select value from public.app_configurations where key='testing.environment.guard'");
assert(marker[0]?.value?.projectId === project && marker[0]?.value?.owner === "ct-noibo-test-v1", "TEST guard mismatch");
const countsSql = "select (select count(*)::int from public.employees) employees,(select count(*)::int from public.app_accounts) accounts,(select count(*)::int from public.attendance_events) personal_attendance,(select count(*)::int from public.worker_attendance_sessions) rounds";
const [counts] = await query(countsSql);
const pending = [];
for (const item of migrations) {
  const registered = await query(`select statements from supabase_migrations.schema_migrations where version='${item.version}'`);
  if (registered.length) assert.deepEqual(registered[0].statements,[item.sql],`Applied migration differs: ${item.version}`);
  else pending.push(item);
}
if (action === "inspect" || !pending.length) { console.log(JSON.stringify({project,counts,pending:pending.map(item=>item.version)}));process.exit(0); }
await mkdir("test-results/workforce-review-20261112",{recursive:true});
const receiptPath="test-results/workforce-review-20261112/workforce-migrations.json";
if(action==="apply") { const receipt=JSON.parse(await readFile(receiptPath,"utf8"));assert(receipt.project===project&&receipt.hash===hash&&receipt.rehearsed&&Date.now()-Date.parse(receipt.at)<3600000,"Rehearse this source first"); }
const assertions=`do $$ begin
 if (select count(*) from shifts where code in ('PORT_SPECIALIZED','PORT_GENERAL') and break_minutes=90 and schedule_rules->>'arrivalLeadMinutes'='15')<>2 then raise exception 'PORT_RULES_MISSING';end if;
 if (select count(*) from employees)<>${counts.employees} or (select count(*) from app_accounts)<>${counts.accounts} or (select count(*) from attendance_events)<>${counts.personal_attendance} or (select count(*) from worker_attendance_sessions)<>${counts.rounds} then raise exception 'EXISTING_RECORD_COUNTS_CHANGED';end if;
end $$;`;
const weatherTest=`do $$ declare entry worker_attendance_entries; actor uuid; batch uuid:=gen_random_uuid(); begin
 select e.* into entry from worker_attendance_entries e join worker_attendance_sessions s on s.id=e.session_id where not exists(select 1 from worker_work_events w where w.entry_id=e.id) and e.is_selected and e.status in ('present','late') and e.checked_in_at is not null and s.status='submitted' and s.attendance_date<(now() at time zone 'Asia/Ho_Chi_Minh')::date and e.checked_in_at>now()-interval '40 days' order by e.checked_in_at desc limit 1;
 select a.id into actor from app_accounts a join account_roles ar on ar.account_id=a.id join roles r on r.id=ar.role_id where a.status='active' and r.code='admin' limit 1;
 if entry.id is null or actor is null then raise exception 'TEST_FIXTURE_REQUIRED';end if;
 if not field_actor_can(actor,array['admin.probe.unassigned']) then raise exception 'ADMIN_FULL_ACCESS_FAILED';end if;
 update worker_attendance_entries set checked_out_at=null where id=entry.id;
 perform record_worker_work_operation(entry.session_id,actor,batch,array[entry.id],'pause',entry.checked_in_at+interval '30 minutes','rain');
 perform record_worker_work_operation(entry.session_id,actor,batch,array[entry.id],'pause',entry.checked_in_at+interval '30 minutes','rain');
 perform record_worker_work_operation(entry.session_id,actor,gen_random_uuid(),array[entry.id],'resume',entry.checked_in_at+interval '60 minutes','resume');
 perform record_worker_work_operation(entry.session_id,actor,gen_random_uuid(),array[entry.id],'finish',entry.checked_in_at+interval '90 minutes','afternoon_off');
 if (select count(*) from worker_work_events where entry_id=entry.id)<>3 then raise exception 'WORK_EVENT_REPLAY_FAILED';end if;
 if (select checked_out_at from worker_attendance_entries where id=entry.id)<>entry.checked_in_at+interval '90 minutes' then raise exception 'INDIVIDUAL_FINISH_FAILED';end if;
 if (select count(*) from attendance_events)<>${counts.personal_attendance} then raise exception 'SUPERVISOR_CLOCK_CHANGED';end if;
end $$;`;
const registrations=pending.map(item=>`insert into supabase_migrations.schema_migrations(version,name,statements) values('${item.version}','${item.filename.slice(item.version.length+1,-4)}',array[$migration$${item.sql}$migration$]);`).join("\n");
const sql=`begin;set local lock_timeout='5s';set local statement_timeout='60s';\n${pending.map(item=>item.sql).join("\n")}\n${assertions}\n${action==='rehearse'?weatherTest:registrations}\n${action==='apply'?'commit':'rollback'};`;
await query(sql,false);
await writeFile(receiptPath,JSON.stringify({project,hash,rehearsed:true,applied:action==="apply",at:new Date().toISOString(),versions:pending.map(item=>item.version),counts,weatherReplayAndIndividualFinishVerified:action==="rehearse"},null,2));
console.log(JSON.stringify({project,action,versions:pending.map(item=>item.version),passed:true}));
