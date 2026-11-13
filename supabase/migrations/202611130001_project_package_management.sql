-- Package deletion preserves attendance, assignments and documents for audit.
alter table public.projects add column if not exists deleted_at timestamptz;
alter table public.projects add column if not exists deleted_by uuid references public.app_accounts(id);

-- Packages created without a worksite must still be selectable for attendance.
insert into public.worksites(project_id,name,status,active_from,created_by)
select p.id,p.name,'active',p.start_date,p.created_by from public.projects p
where p.deleted_at is null and p.status in ('active','preparing')
and not exists(select 1 from public.worksites w where w.project_id=p.id);

create or replace function public.create_project_package(p_values jsonb,p_actor_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if not public.field_actor_can(p_actor_id,array['project.create']) then
  raise exception using errcode='42501',message='ACTOR_DENIED';
 end if;
 insert into public.projects(code,name,customer_name,summary,start_date,expected_end_date,status,project_manager_employee_id,note,created_by)
 values(p_values->>'code',p_values->>'name',nullif(p_values->>'customer_name',''),nullif(p_values->>'summary',''),(p_values->>'start_date')::date,nullif(p_values->>'expected_end_date','')::date,coalesce(p_values->>'status','preparing')::public.project_status,nullif(p_values->>'project_manager_employee_id','')::uuid,nullif(p_values->>'note',''),p_actor_id)
 returning id into v_id;
 insert into public.worksites(project_id,name,status,active_from,created_by)
 values(v_id,p_values->>'name','active',(p_values->>'start_date')::date,p_actor_id);
 return v_id;
end; $$;
revoke all on function public.create_project_package(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.create_project_package(jsonb,uuid) to service_role;

create or replace function public.delete_project_package(p_project_id uuid,p_row_version integer,p_actor_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_project public.projects;
begin
 if not public.field_actor_can(p_actor_id,array['project.edit']) then
  raise exception using errcode='42501',message='ACTOR_DENIED';
 end if;
 select * into v_project from public.projects where id=p_project_id and deleted_at is null for update;
 if not found then raise exception using errcode='P0002',message='PROJECT_NOT_FOUND';end if;
 if v_project.row_version<>p_row_version then raise exception using errcode='40001',message='VERSION_CONFLICT';end if;
 if exists(select 1 from public.worker_attendance_sessions where project_id=p_project_id and status in ('draft','in_progress')) then
  raise exception using errcode='23514',message='ATTENDANCE_IN_PROGRESS';
 end if;
 update public.projects set deleted_at=now(),deleted_by=p_actor_id,status='closed' where id=p_project_id;
 return p_project_id;
end; $$;
revoke all on function public.delete_project_package(uuid,integer,uuid) from public,anon,authenticated;
grant execute on function public.delete_project_package(uuid,integer,uuid) to service_role;

-- Serialize starting attendance with package deletion.
create or replace function public.guard_worker_session_project()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_status public.project_status;v_deleted timestamptz;
begin
 select status,deleted_at into v_status,v_deleted from public.projects where id=new.project_id for share;
 if not found or v_deleted is not null or v_status<>'active' then
  raise exception using errcode='23514',message='PROJECT_NOT_ACTIVE';
 end if;
 return new;
end; $$;
drop trigger if exists worker_session_project_active on public.worker_attendance_sessions;
create trigger worker_session_project_active before insert on public.worker_attendance_sessions for each row execute function public.guard_worker_session_project();
notify pgrst,'reload schema';
