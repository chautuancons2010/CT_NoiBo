import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {managementClient} from '../testing/management.mjs';

const project='lgmlkagcytfjazulgfbz',version='202611130001';
const action=process.argv[2]??'inspect';assert(['inspect','rehearse','apply'].includes(action));
const sql=await readFile(`supabase/migrations/${version}_project_package_management.sql`,'utf8');
const hash=createHash('sha256').update(sql).digest('hex');
const api=await managementClient();
const query=(query,read_only=true)=>api('POST',`/v1/projects/${project}/database/query`,{query,read_only});
const guard=await query("select value from app_configurations where key='testing.environment.guard'");
assert.equal(guard[0]?.value?.projectId,project,'Only isolated TEST is authorized');
const registered=await query(`select statements from supabase_migrations.schema_migrations where version='${version}'`);
if(registered.length){assert.deepEqual(registered[0].statements,[sql]);console.log(JSON.stringify({project,alreadyApplied:true,version}));process.exit(0);}
const snapshot=`select (select count(*) from employees)::int employees,(select count(*) from app_accounts)::int accounts,(select count(*) from attendance_events)::int attendance,(select count(*) from worker_attendance_sessions)::int sessions,(select count(*) from worker_attendance_entries)::int entries,(select count(*) from projects)::int projects,(select count(*) from worksites)::int worksites`;
const [before]=await query(snapshot);
if(action==='inspect'){console.log(JSON.stringify({project,pending:version,before}));process.exit(0);}
const path='test-results/recovery-20261113/test-package-migration.json';
if(action==='apply'){const proof=JSON.parse(await readFile(path,'utf8'));assert(proof.hash===hash&&proof.rehearsed&&Date.now()-Date.parse(proof.at)<3600000);assert.deepEqual(proof.before,before);}
const tests=`do $$ declare actor uuid;emp uuid;pid uuid;site uuid;sid uuid;rv integer;begin
 select a.id,a.employee_id into actor,emp from app_accounts a join account_roles ar on ar.account_id=a.id join roles r on r.id=ar.role_id where a.status='active' and r.code='admin' and a.employee_id is not null limit 1;
 if actor is null then raise exception 'TEST_ADMIN_MISSING';end if;
 pid:=create_project_package(jsonb_build_object('code','PKG-PROOF-'||gen_random_uuid(),'name','[TEST] Package proof','start_date','2026-11-13','status','active'),actor);
 select id into site from worksites where project_id=pid;
 if site is null or exists(select 1 from shift_assignments where scope_type='project' and scope_id=pid) then raise exception 'CREATE_PACKAGE_FAILED';end if;
 select row_version into rv from projects where id=pid;
 begin perform delete_project_package(pid,rv+1,actor);raise exception 'STALE_DELETE_ACCEPTED';exception when serialization_failure then null;end;
 begin perform delete_project_package(pid,rv,null);raise exception 'ANONYMOUS_DELETE_ACCEPTED';exception when insufficient_privilege then null;end;
 insert into worker_attendance_sessions(client_session_id,project_id,project_name_snapshot,worksite_id,worksite_name_snapshot,attendance_date,shift_code,shift_name_snapshot,supervisor_employee_id,supervisor_name_snapshot,captured_at_client,status,created_by)
 values(gen_random_uuid(),pid,'[TEST] Package proof',site,'[TEST] Site','2026-11-13','PORT_GENERAL','Cảng tổng hợp',emp,'[TEST] Supervisor',now(),'in_progress',actor) returning id into sid;
 begin perform delete_project_package(pid,rv,actor);raise exception 'ACTIVE_SESSION_DELETE_ACCEPTED';exception when check_violation then if sqlerrm<>'ATTENDANCE_IN_PROGRESS' then raise;end if;end;
 update worker_attendance_sessions set status='submitted',submitted_at=now() where id=sid;
 perform delete_project_package(pid,rv,actor);
 if not exists(select 1 from projects where id=pid and deleted_at is not null and status='closed') or not exists(select 1 from worker_attendance_sessions where id=sid and status='submitted') or not exists(select 1 from worksites where id=site) then raise exception 'HISTORY_NOT_PRESERVED';end if;
 begin
  insert into worker_attendance_sessions(client_session_id,project_id,project_name_snapshot,worksite_id,worksite_name_snapshot,attendance_date,shift_code,shift_name_snapshot,supervisor_employee_id,supervisor_name_snapshot,captured_at_client,status,created_by)
  values(gen_random_uuid(),pid,'[TEST] Deleted',site,'[TEST] Site','2026-11-14','PORT_SPECIALIZED','Cảng chuyên dụng',emp,'[TEST] Supervisor',now(),'in_progress',actor);
  raise exception 'DELETED_PACKAGE_SESSION_ACCEPTED';
 exception when check_violation then if sqlerrm<>'PROJECT_NOT_ACTIVE' then raise;end if;end;
 if has_function_privilege('anon','public.delete_project_package(uuid,integer,uuid)','execute') or has_function_privilege('authenticated','public.create_project_package(jsonb,uuid)','execute') then raise exception 'PUBLIC_RPC_ACCESS';end if;
end $$;`;
const registration=`insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','project_package_management',array[$migration$${sql}$migration$]);`;
await query(`begin;set local lock_timeout='5s';set local statement_timeout='30s';${sql}\n${action==='rehearse'?tests:registration}\n${action==='apply'?'commit':'rollback'};`,false);
const [after]=await query(snapshot);
for(const key of Object.keys(before).filter(key=>key!=='worksites'))assert.equal(after[key],before[key],key);
if(action==='rehearse')assert.deepEqual(after,before);
await mkdir('test-results/recovery-20261113',{recursive:true});
const report={project,hash,version,before,after,rehearsed:true,applied:action==='apply',at:new Date().toISOString(),checks:['atomic package and worksite creation','no package port assignment','stale deletion rejected','unauthorized deletion rejected','active attendance blocks deletion','submitted attendance and worksites preserved','new attendance rejects deleted package','service-only RPC']};
await writeFile(path,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
