import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {managementClient} from '../testing/management.mjs';
const [environment,action='inspect']=process.argv.slice(2);
const projects={test:'lgmlkagcytfjazulgfbz',production:'uioywupuuestcaliawlc'};
assert(Object.hasOwn(projects,environment));assert(['inspect','rehearse','apply'].includes(action));
const project=projects[environment],api=await managementClient();
const query=(query,read_only=true)=>api('POST',`/v1/projects/${project}/database/query`,{query,read_only});
const marker=await query("select value from app_configurations where key='testing.environment.guard'");
if(environment==='test')assert.equal(marker[0]?.value?.projectId,project);else assert.equal(marker.length,0);
const files=['202611130003_worker_offline_capture_clocks.sql'];
const pending=[];
for(const file of files){const sql=await readFile('supabase/migrations/'+file,'utf8'),version=file.split('_')[0];const rows=await query(`select statements from supabase_migrations.schema_migrations where version='${version}'`);if(rows.length)assert.deepEqual(rows[0].statements,[sql]);else pending.push({file,version,sql});}
const snapshot=`select
 (select count(*) from employees)::int employees,(select count(*) from app_accounts)::int accounts,
 (select count(*) from attendance_events)::int attendance,(select count(*) from worker_attendance_sessions)::int sessions,
 (select count(*) from worker_attendance_entries)::int entries,(select count(*) from projects)::int projects,(select count(*) from worksites)::int worksites,
 (select md5(coalesce(jsonb_agg(to_jsonb(p)-'deleted_at'-'deleted_by' order by p.id)::text,'')) from projects p) project_digest,
 (select md5(coalesce(jsonb_agg(to_jsonb(a) order by a.id)::text,'')) from project_assignments a) assignment_digest`;
const [before]=await query(snapshot);
const missingSites=await query("select count(*)::int count from projects p where p.status in ('active','preparing') and not exists(select 1 from worksites w where w.project_id=p.id)");
if(!pending.length||action==='inspect'){console.log(JSON.stringify({project,pending:pending.map(item=>item.version),before,missingSites:missingSites[0].count}));process.exit(0);}
const hash=createHash('sha256').update(pending.map(item=>item.sql).join('\n')).digest('hex'),receipt=`test-results/mobile-attendance-20261113/migration-${environment}.json`;
if(action==='apply'){const proof=JSON.parse(await readFile(receipt,'utf8'));assert(proof.rehearsed&&proof.hash===hash&&Date.now()-Date.parse(proof.at)<3600000);assert.deepEqual(proof.before,before);}
const registration=pending.map(({file,version,sql})=>`${sql}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${file.slice(13,-4)}',array[$migration$${sql}$migration$]);`).join('\n');
const check=`do $$ begin
 if exists(select 1 from projects p where p.deleted_at is null and p.status in ('active','preparing') and not exists(select 1 from worksites w where w.project_id=p.id)) then raise exception 'WORKSITE_MISSING';end if;
 if has_function_privilege('anon','public.delete_project_package(uuid,integer,uuid)','execute') or has_function_privilege('authenticated','public.create_project_package(jsonb,uuid)','execute') then raise exception 'PUBLIC_RPC';end if;
end $$;`;
await query(`begin;set local lock_timeout='5s';set local statement_timeout='45s';${registration}\n${check}\n${action==='apply'?'commit':'rollback'};`,false);
const [after]=await query(snapshot);
for(const key of Object.keys(before).filter(key=>key!=='worksites'))assert.equal(after[key],before[key],key);
assert.equal(after.worksites,before.worksites+(action==='apply'&&pending.some(item=>item.version==='202611130001')?missingSites[0].count:0));
await mkdir('test-results/mobile-attendance-20261113',{recursive:true});
const report={environment,project,hash,pending:pending.map(item=>item.version),before,after,rehearsed:true,applied:action==='apply',fixturesCreated:false,accountsAndAttendancePreserved:true,at:new Date().toISOString()};
await writeFile(receipt,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
