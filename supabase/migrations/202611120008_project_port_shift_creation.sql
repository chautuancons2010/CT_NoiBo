-- A new package and its chosen port schedule must be created together.
-- Existing packages keep their assignments until an operator chooses a port.
create or replace function public.create_project_with_port_shift(
 p_values jsonb, p_port_shift_code text, p_actor_id uuid
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_project_id uuid; v_shift_id uuid; v_start date;
begin
 if not public.field_actor_can(p_actor_id,array['project.create']) then
  raise exception using errcode='42501',message='ACTOR_DENIED';
 end if;
 if p_port_shift_code is null or p_port_shift_code not in ('PORT_SPECIALIZED','PORT_GENERAL') then
  raise exception using errcode='22023',message='PORT_REQUIRED';
 end if;
 select id into v_shift_id from public.shifts where code=p_port_shift_code and active;
 if v_shift_id is null then raise exception using errcode='22023',message='PORT_SHIFT_MISSING'; end if;
 v_start := (p_values->>'start_date')::date;
 insert into public.projects(code,name,customer_name,summary,start_date,expected_end_date,status,project_manager_employee_id,note,created_by)
 values(p_values->>'code',p_values->>'name',nullif(p_values->>'customer_name',''),nullif(p_values->>'summary',''),v_start,nullif(p_values->>'expected_end_date','')::date,coalesce(p_values->>'status','preparing')::public.project_status,nullif(p_values->>'project_manager_employee_id','')::uuid,nullif(p_values->>'note',''),p_actor_id)
 returning id into v_project_id;
 insert into public.shift_assignments(shift_id,scope_type,scope_id,effective_from,weekdays,active,created_by)
 values(v_shift_id,'project',v_project_id,v_start,array[1,2,3,4,5,6],true,p_actor_id);
 return v_project_id;
end; $$;
revoke all on function public.create_project_with_port_shift(jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.create_project_with_port_shift(jsonb,text,uuid) to service_role;
