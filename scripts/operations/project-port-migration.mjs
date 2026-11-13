import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { managementClient } from '../testing/management.mjs';
const [environment,action='inspect']=process.argv.slice(2),projects={test:'lgmlkagcytfjazulgfbz',production:'uioywupuuestcaliawlc'};
assert(Object.hasOwn(projects,environment));assert(['inspect','rehearse','apply'].includes(action));
const project=projects[environment],version='202611120008',sql=await readFile(`supabase/migrations/${version}_project_port_shift_creation.sql`,'utf8'),hash=createHash('sha256').update(sql).digest('hex');
const api=await managementClient(),query=(query,read_only=true)=>api('POST',`/v1/projects/${project}/database/query`,{query,read_only});
const marker=await query("select value from app_configurations where key='testing.environment.guard'");
if(environment==='test')assert.equal(marker[0]?.value?.projectId,project);else assert.equal(marker.length,0);
const snapshot=`select (select count(*) from employees)::int employees,(select count(*) from app_accounts)::int accounts,(select count(*) from attendance_events)::int attendance,(select count(*) from worker_attendance_sessions)::int rounds,(select count(*) from projects)::int projects,(select count(*) from shift_assignments)::int assignments,(select md5(coalesce(jsonb_agg(to_jsonb(p) order by p.id)::text,'')) from projects p) project_digest,(select md5(coalesce(jsonb_agg(to_jsonb(s) order by s.id)::text,'')) from shift_assignments s) assignment_digest`;
const [before]=await query(snapshot),registered=await query(`select statements from supabase_migrations.schema_migrations where version='${version}'`);
if(registered.length){assert.deepEqual(registered[0].statements,[sql]);console.log(JSON.stringify({project,alreadyApplied:true,counts:before}));process.exit(0);}
if(action==='inspect'){console.log(JSON.stringify({project,pending:version,counts:before}));process.exit(0);}
const receiptPath=`test-results/arrival-policy-20261112/port-migration-${environment}.json`;
if(action==='apply'){const r=JSON.parse(await readFile(receiptPath,'utf8'));assert(r.project===project&&r.hash===hash&&r.rehearsed&&Date.now()-Date.parse(r.at)<3600000);assert.deepEqual(r.before,before);}
const checks=`do $$ declare current_snapshot jsonb; begin
 select to_jsonb(s) into current_snapshot from (${snapshot}) s;
 if current_snapshot<>'${JSON.stringify(before)}'::jsonb then raise exception 'EXISTING_BUSINESS_RECORDS_CHANGED';end if;
 if has_function_privilege('anon','public.create_project_with_port_shift(jsonb,text,uuid)','execute') or has_function_privilege('authenticated','public.create_project_with_port_shift(jsonb,text,uuid)','execute') then raise exception 'RPC_PUBLIC_EXECUTION';end if;
end $$;`;
const test=`do $$ declare actor uuid; pid uuid; port text; before_invalid int;begin
 select a.id into actor from app_accounts a join account_roles ar on ar.account_id=a.id join roles r on r.id=ar.role_id where a.status='active' and r.code='admin' limit 1;
 if actor is null then raise exception 'TEST_ADMIN_MISSING';end if;
 foreach port in array array['PORT_SPECIALIZED','PORT_GENERAL'] loop
  pid:=create_project_with_port_shift(jsonb_build_object('code','PORT-PROOF-'||gen_random_uuid(),'name','[TEST] Port assignment rollback','start_date','2026-11-13','status','preparing'),port,actor);
  if not exists(select 1 from shift_assignments a join shifts s on s.id=a.shift_id where a.scope_type='project' and a.scope_id=pid and a.active and a.weekdays=array[1,2,3,4,5,6] and a.effective_from='2026-11-13' and s.code=port) then raise exception 'PORT_SCHEDULE_NOT_ATOMIC';end if;
 end loop;
 select count(*) into before_invalid from projects;
 begin
  perform create_project_with_port_shift(jsonb_build_object('code','INVALID-PROOF','name','Invalid','start_date','2026-11-13'),'DAY',actor);
  raise exception 'INVALID_PORT_ACCEPTED';
 exception when invalid_parameter_value then null;end;
 if (select count(*) from projects)<>before_invalid then raise exception 'INVALID_PORT_LEFT_PROJECT';end if;
end $$;`;
const registration=`insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','project_port_shift_creation',array[$migration$${sql}$migration$]);`;
await query(`begin;set local lock_timeout='5s';set local statement_timeout='30s';${sql}\n${checks}\n${action==='rehearse'&&environment==='test'?test:''}\n${action==='apply'?registration:''}\n${action==='apply'?'commit':'rollback'};`,false);
const [after]=await query(snapshot);assert.deepEqual(after,before);
await mkdir('test-results/arrival-policy-20261112',{recursive:true});
await writeFile(receiptPath,JSON.stringify({project,hash,before,rehearsed:true,applied:action==='apply',fixtureInvocations:environment==='test'&&action==='rehearse',at:new Date().toISOString()},null,2));
console.log(JSON.stringify({project,action,passed:true,preservedRecords:true,version,productionFixtures:false}));
