import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {managementClient} from '../testing/management.mjs';

const [environment,action='inspect']=process.argv.slice(2);
const refs={test:'lgmlkagcytfjazulgfbz',production:'uioywupuuestcaliawlc'};
assert(Object.hasOwn(refs,environment));assert(['inspect','rehearse','apply'].includes(action));
const ref=refs[environment],client=await managementClient();
const query=(query,read_only=true)=>client('POST',`/v1/projects/${ref}/database/query`,{query,read_only});
const marker=await query("select value from app_configurations where key='testing.environment.guard'");
if(environment==='test')assert.equal(marker[0]?.value?.projectId,ref);else assert.equal(marker.length,0);
const file='202611130007_entered_overtime_without_safety_repeat.sql',version=file.split('_')[0];
const sql=await readFile('supabase/migrations/'+file,'utf8'),hash=createHash('sha256').update(sql).digest('hex');
const applied=await query(`select statements from supabase_migrations.schema_migrations where version='${version}'`);
const snapshotSql=`select ${['projects','worksites','project_assignments','worker_attendance_sessions','worker_attendance_entries','worker_attendance_photos','worker_work_events','attendance_events'].map(table=>`(select md5(coalesce(jsonb_agg(to_jsonb(t)-'overtime_recording_mode'-'overtime_time_entry' order by t.id)::text,'')) from ${table} t) as ${table}`).join(',')}`;
const [before]=await query(snapshotSql);
const out='test-results/flexible-overtime-20261113';await mkdir(out,{recursive:true});
const receipt=`${out}/report-migration-${environment}.json`;
if(applied.length){assert.deepEqual(applied[0].statements,[sql]);console.log(JSON.stringify({environment,alreadyApplied:true}));process.exit(0);}
if(action==='inspect'){console.log(JSON.stringify({environment,pending:version,before}));process.exit(0);}
if(action==='apply'){
 const proof=JSON.parse(await readFile(receipt,'utf8'));
 assert(proof.rehearsed&&proof.hash===hash&&Date.now()-Date.parse(proof.at)<3600000);
}
const checks=`do $$ begin
 if to_regprocedure('public.record_worker_overtime_time_entry(uuid,uuid,jsonb)') is null then raise exception 'FUNCTION_MISSING';end if;
 if has_function_privilege('anon','public.record_worker_overtime_time_entry(uuid,uuid,jsonb)','execute') or has_function_privilege('authenticated','public.record_worker_overtime_time_entry(uuid,uuid,jsonb)','execute') then raise exception 'PUBLIC_RPC';end if;
end $$;`;
await query(`begin;set local lock_timeout='5s';set local statement_timeout='45s';${sql}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','entered_overtime_without_safety_repeat',array[$migration$${sql}$migration$]);\n${checks}\n${action==='apply'?'commit':'rollback'};`,false);
const [after]=await query(snapshotSql);assert.deepEqual(after,before,'Migration must not change business data');
const report={environment,ref,hash,rehearsed:true,applied:action==='apply',businessDataUnchanged:true,before,after,at:new Date().toISOString()};
await writeFile(receipt,JSON.stringify(report,null,2));console.log(JSON.stringify({environment,applied:report.applied,rehearsed:true,businessDataUnchanged:true}));
