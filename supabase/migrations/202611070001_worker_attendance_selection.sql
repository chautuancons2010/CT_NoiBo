-- Supervisors select the active package and the people actually attending.
-- Existing sessions keep the previous roster workflow and historical snapshots.
alter table public.worker_attendance_sessions
  add column if not exists selection_mode boolean not null default false,
  add column if not exists safety_confirmed boolean not null default false,
  add column if not exists minimum_photos_snapshot integer not null default 0 check (minimum_photos_snapshot >= 0);
alter table public.worker_attendance_entries
  add column if not exists is_selected boolean not null default true;

insert into public.role_permissions(role_id,permission_key)
select r.id,p.key from public.roles r cross join public.permissions p
where r.code='hr' and p.key=any(array['project.view','project.create','project.edit','project.manage_team','worksite.view','worksite.manage'])
on conflict do nothing;

create or replace function public.assert_worker_session_actor(p_session_id uuid,p_actor_id uuid,p_permissions text[])
returns void language plpgsql security definer set search_path=public as $$
declare v_session worker_attendance_sessions%rowtype;v_employee_id uuid;
begin
  if not field_actor_can(p_actor_id,p_permissions) then raise exception 'FIELD_ACTOR_DENIED';end if;
  select employee_id into v_employee_id from app_accounts where id=p_actor_id and status='active';
  if v_employee_id is null then raise exception 'FIELD_ACTOR_DENIED';end if;
  select * into v_session from worker_attendance_sessions where id=p_session_id;
  if not found then raise exception 'FIELD_SESSION_NOT_FOUND';end if;
  if field_actor_can(p_actor_id,array['worker_attendance.view_all','worker_attendance.create']) then return;end if;
  if not exists(select 1 from project_assignments where project_id=v_session.project_id and worksite_id=v_session.worksite_id
    and employee_id=v_employee_id and assignment_role in ('supervisor_main','supervisor_replacement','project_manager')
    and status='active' and start_date<=v_session.attendance_date and (end_date is null or end_date>=v_session.attendance_date))
    then raise exception 'FIELD_ACTOR_DENIED';end if;
end $$;

create or replace function public.save_worker_session_draft_command(
  p_session_id uuid,p_expected_version integer,p_actor_id uuid,p_header jsonb,p_entries jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_session worker_attendance_sessions%rowtype;v_entry jsonb;v_response jsonb;
begin
  select * into v_session from worker_attendance_sessions where id=p_session_id for update;
  if not found then raise exception 'FIELD_SESSION_NOT_FOUND';end if;
  perform assert_worker_session_actor(p_session_id,p_actor_id,array['worker_attendance.create']);
  if p_expected_version is null or v_session.version<>p_expected_version then raise exception 'FIELD_VERSION_CONFLICT';end if;
  if v_session.submitted_at is not null or v_session.status in ('submitted','locked') then raise exception 'FIELD_SESSION_NOT_EDITABLE';end if;
  if p_entries is null or jsonb_typeof(p_entries)<>'array' or jsonb_array_length(p_entries)>500
    or p_header is null or jsonb_typeof(p_header)<>'object'
    or jsonb_typeof(p_header->'checklist_responses') is distinct from 'array'
    or jsonb_array_length(p_header->'checklist_responses')>100 then raise exception 'FIELD_INPUT_INVALID';end if;
  if (select count(*) from jsonb_array_elements(p_entries))<>(select count(distinct entry->>'id') from jsonb_array_elements(p_entries) entry) then raise exception 'FIELD_ENTRY_INVALID';end if;
  for v_response in select value from jsonb_array_elements(p_header->'checklist_responses') loop
    if not exists(select 1 from jsonb_array_elements(coalesce(v_session.checklist_snapshot,'[]'::jsonb)) item where item->>'id'=v_response->>'itemId') then raise exception 'FIELD_CHECKLIST_INVALID';end if;
  end loop;
  for v_entry in select value from jsonb_array_elements(p_entries) loop
    perform 1 from worker_attendance_entries where id=(v_entry->>'id')::uuid and session_id=p_session_id for update;
    if not found then raise exception 'FIELD_ENTRY_INVALID';end if;
    update worker_attendance_entries set status=(v_entry->>'status')::worker_attendance_entry_status,
      is_selected=case when v_session.selection_mode then coalesce((v_entry->>'isSelected')::boolean,is_selected) else true end,
      exception_reason=nullif(v_entry->>'exceptionReason','')::worker_exception_reason,
      day_exception=coalesce(v_entry->>'dayException','none')::worker_day_exception,
      exception_time=nullif(v_entry->>'exceptionTime','')::time,note=v_entry->>'note'
    where id=(v_entry->>'id')::uuid and session_id=p_session_id;
  end loop;
  update worker_attendance_sessions set work_note=p_header->>'work_note',note=p_header->>'note',
    safety_confirmed=coalesce((p_header->>'safety_confirmed')::boolean,safety_confirmed),
    checklist_responses=p_header->'checklist_responses',status='in_progress',sync_status='synced',
    latitude=case when p_header?'latitude' then (p_header->>'latitude')::double precision else latitude end,
    longitude=case when p_header?'longitude' then (p_header->>'longitude')::double precision else longitude end,
    accuracy_meters=case when p_header?'accuracy_meters' then (p_header->>'accuracy_meters')::double precision else accuracy_meters end,
    geofence_status=case when p_header?'geofence_status' then p_header->>'geofence_status' else geofence_status end,
    distance_meters=case when p_header?'distance_meters' then (p_header->>'distance_meters')::double precision else distance_meters end
  where id=p_session_id;
  return p_session_id;
end $$;

create or replace function public.validate_worker_selection_submit()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_minimum_photos integer;
begin
  if not new.selection_mode or new.submitted_at is null or old.submitted_at is not null then return new;end if;
  perform pg_advisory_xact_lock(hashtextextended('worker-attendance:'||new.attendance_date::text||':'||new.shift_code,0));
  if not exists(select 1 from worker_attendance_entries where session_id=new.id and is_selected and status in ('present','late'))
    then raise exception 'FIELD_SELECTION_REQUIRED';end if;
  if exists(select 1 from worker_attendance_entries where session_id=new.id and is_selected and status not in ('present','late'))
    then raise exception 'FIELD_SELECTION_INVALID';end if;
  if not new.safety_confirmed then raise exception 'FIELD_SAFETY_REQUIRED';end if;
  select greatest(1,new.minimum_photos_snapshot,coalesce(minimum_photos,0)) into v_minimum_photos
    from worker_attendance_policies where active limit 1;
  if (select count(*) from worker_attendance_photos where session_id=new.id)<coalesce(v_minimum_photos,1)
    then raise exception 'FIELD_PHOTO_REQUIRED';end if;
  if exists(select 1 from worker_attendance_entries chosen
    join worker_attendance_entries other on other.worker_id=chosen.worker_id and other.session_id<>new.id
    join worker_attendance_sessions s on s.id=other.session_id
    where chosen.session_id=new.id and chosen.is_selected and other.is_selected and other.status in ('present','late')
      and s.attendance_date=new.attendance_date and s.shift_code=new.shift_code and s.session_type=new.session_type
      and s.submitted_at is not null and s.status in ('submitted','locked','needs_review'))
    then raise exception 'FIELD_WORKER_ALREADY_RECORDED';end if;
  return new;
end $$;

create trigger worker_selection_submit_check before update of submitted_at on public.worker_attendance_sessions
  for each row execute function public.validate_worker_selection_submit();

revoke all on function public.assert_worker_session_actor(uuid,uuid,text[]) from public,anon,authenticated;
revoke all on function public.save_worker_session_draft_command(uuid,integer,uuid,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.validate_worker_selection_submit() from public,anon,authenticated;
grant execute on function public.assert_worker_session_actor(uuid,uuid,text[]) to service_role;
grant execute on function public.save_worker_session_draft_command(uuid,integer,uuid,jsonb,jsonb) to service_role;
