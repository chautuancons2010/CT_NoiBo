-- Removing a package must not depend on the progress of its attendance sessions.
-- Soft deletion retains sessions, entries, photos, assignments and their timestamps.
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
 update public.projects set deleted_at=now(),deleted_by=p_actor_id,status='closed' where id=p_project_id;
 return p_project_id;
end; $$;
revoke all on function public.delete_project_package(uuid,integer,uuid) from public,anon,authenticated;
grant execute on function public.delete_project_package(uuid,integer,uuid) to service_role;
notify pgrst,'reload schema';
