-- A package does not need a supervisor assignment or an activation approval.
-- Paused, completed, closed and deleted packages remain unavailable for new attendance.
alter table public.projects alter column status set default 'active';

create or replace function public.guard_worker_session_project()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_status public.project_status;v_deleted timestamptz;
begin
 select status,deleted_at into v_status,v_deleted from public.projects where id=new.project_id for share;
 if not found or v_deleted is not null or v_status not in ('active','preparing') then
  raise exception using errcode='23514',message='PROJECT_NOT_ACTIVE';
 end if;
 return new;
end; $$;

create or replace function public.create_project_package(p_values jsonb,p_actor_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if not public.field_actor_can(p_actor_id,array['project.create']) then
  raise exception using errcode='42501',message='ACTOR_DENIED';
 end if;
 insert into public.projects(code,name,customer_name,summary,start_date,expected_end_date,status,project_manager_employee_id,note,created_by)
 values(p_values->>'code',p_values->>'name',nullif(p_values->>'customer_name',''),nullif(p_values->>'summary',''),(p_values->>'start_date')::date,nullif(p_values->>'expected_end_date','')::date,coalesce(p_values->>'status','active')::public.project_status,nullif(p_values->>'project_manager_employee_id','')::uuid,nullif(p_values->>'note',''),p_actor_id)
 returning id into v_id;
 insert into public.worksites(project_id,name,status,active_from,created_by)
 values(v_id,p_values->>'name','active',(p_values->>'start_date')::date,p_actor_id);
 return v_id;
end; $$;
revoke all on function public.create_project_package(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.create_project_package(jsonb,uuid) to service_role;
notify pgrst,'reload schema';
