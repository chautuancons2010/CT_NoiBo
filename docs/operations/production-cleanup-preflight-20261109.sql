-- READ-ONLY PREFLIGHT ONLY. No DELETE, TRUNCATE, DDL or auth/storage mutation.
-- Intended host: db.uioywupuuestcaliawlc.supabase.co (or its verified pooler).
-- NEVER run against lgmlkagcytfjazulgfbz. The runner must validate the connection
-- hostname AND pooler username/project against the intended production project.
-- A caller-supplied SET variable alone does not prove which project is connected.
begin transaction read only;
set local statement_timeout = '30s';
set local lock_timeout = '3s';

select current_database() as database_name, current_user as database_role,
       current_setting('supabase.project_ref', true) as server_project_ref_if_available;

-- Must return zero rows. Any test-owner/environment guard blocks the entire plan.
select key, scope
from public.app_configurations
where key = 'testing.environment.guard';

-- Must return exactly one active account with non-null linked employee/auth IDs,
-- matching auth user, employee and admin role. Do not save email/password data.
select a.id as account_id, a.username, a.status,
       a.auth_user_id, a.employee_id,
       (u.id is not null) as auth_identity_exists,
       e.department_id, e.position_id, e.employment_type_id,
       exists (
         select 1 from public.account_roles ar join public.roles r on r.id = ar.role_id
         where ar.account_id = a.id and r.code = 'admin'
       ) as has_admin_role,
       exists (
         select 1 from public.account_roles ar
         join public.roles r on r.id = ar.role_id
         join public.role_permissions rp on rp.role_id = r.id
         where ar.account_id = a.id and r.code = 'admin' and rp.permission_key = 'system_admin.access'
       ) as has_system_admin_access
from public.app_accounts a
left join auth.users u on u.id = a.auth_user_id
left join public.employees e on e.id = a.employee_id
where a.id = '9266af45-4b87-4aaf-99a3-03fbb7288d2b'::uuid and a.username = 'admin';

select (select count(*) from public.app_accounts) as accounts,
       (select count(*) from auth.users) as auth_users,
       (select count(*) from public.employees) as employees,
       (select count(*) from public.attendance_events) as attendance_events,
       (select count(*) from public.projects) as projects,
       (select count(*) from public.worker_attendance_sessions) as worker_sessions;

-- A current, complete inventory is mandatory. reltuples are estimates, not proof
-- of exact table counts. Use an approved runner to issue COUNT(*) per live table.
select n.nspname as schema_name, c.relname as table_name, c.relkind,
       c.reltuples::bigint as estimated_rows,
       pg_get_userbyid(c.relowner) as table_owner
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p') order by c.relname;

-- Includes incoming references from other schemas: abort on an unreviewed edge.
select con.oid, con.conname,
       con.conrelid::regclass::text as child_table,
       con.confrelid::regclass::text as parent_table,
       con.condeferrable, con.condeferred, con.convalidated,
       pg_get_constraintdef(con.oid, true) as definition
from pg_catalog.pg_constraint con
where con.contype = 'f' and (
  con.conrelid in (select c.oid from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public')
  or con.confrelid in (select c.oid from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public')
) order by child_table, con.conname;

select n.nspname as schema_name, c.relname as table_name, a.attname as column_name,
       a.attnotnull as not_null, pg_catalog.format_type(a.atttypid,a.atttypmod) as data_type
from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid=a.attrelid
join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p') and a.attnum>0 and not a.attisdropped
order by c.relname,a.attnum;

-- Preserve exact tgenabled state. Never disable constraint/internal triggers.
select n.nspname as schema_name, c.relname as table_name, t.tgname,
       t.tgenabled, t.tgisinternal, pg_get_triggerdef(t.oid, true) as definition
from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid
join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' order by c.relname,t.tgname;

select version, name from supabase_migrations.schema_migrations order by version;

-- IDs/paths are still private operational data: export only to the protected
-- backup location, never commit a result set or upload it to a public repository.
select b.id as bucket_id, b.public, count(o.id) as object_count
from storage.buckets b left join storage.objects o on o.bucket_id=b.id
group by b.id,b.public order by b.id;

rollback;
